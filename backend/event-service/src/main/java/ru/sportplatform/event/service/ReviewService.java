package ru.sportplatform.event.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.policy.ReputationPolicy;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.event.client.IdentityClient;
import ru.sportplatform.event.domain.EventReview;
import ru.sportplatform.event.domain.Registration;
import ru.sportplatform.event.domain.SportEvent;
import ru.sportplatform.event.repository.EventReviewRepository;
import ru.sportplatform.event.repository.RegistrationRepository;
import ru.sportplatform.event.web.dto.EventReviewDto;
import ru.sportplatform.event.web.dto.EventReviewForm;
import ru.sportplatform.event.web.dto.EventReviewSummaryDto;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final EventReviewRepository reviews;
    private final RegistrationRepository registrations;
    private final EventService eventService;
    private final IdentityClient identity;

    @Transactional(readOnly = true)
    public List<EventReviewDto> list(CurrentUser current, Long eventId) {
        eventService.findVisible(current, eventId);
        return reviews.findByEventIdOrderByCreatedAtDesc(eventId).stream()
                .map(r -> toDto(r, current))
                .toList();
    }

    @Transactional(readOnly = true)
    public EventReviewSummaryDto summary(Long eventId) {
        if (reviews.countByEventId(eventId) == 0) {
            return new EventReviewSummaryDto(0, 0);
        }
        return new EventReviewSummaryDto(reviews.averageStars(eventId), reviews.countByEventId(eventId));
    }

    @Transactional
    public EventReviewDto upsert(CurrentUser current, Long eventId, EventReviewForm form) {
        current.requireAuthenticated();
        SportEvent event = eventService.findVisible(current, eventId);
        if (event.getStatus() == EventStatus.UNPUBLISHED || event.getStatus() == EventStatus.DELETED) {
            throw ApiException.conflict("Мероприятие снято — отзывы больше не принимаются");
        }
        List<Registration> regs = registrations.findByEventIdOrderByCreatedAtAsc(eventId);
        String blocked = eventService.reviewBlockedReason(event, current, regs);
        if (blocked != null) {
            throw ApiException.forbidden(blocked);
        }

        UserDto author = identity.getUser(current.id());
        EventReview review = reviews.findByEventIdAndAuthorId(eventId, current.id()).orElse(null);
        int oldStars = review == null ? 0 : review.getStars();
        int newStars = form.stars();
        if (review == null) {
            review = EventReview.builder()
                    .eventId(eventId)
                    .organizerUserId(event.getOrganizerUserId())
                    .authorId(author.id())
                    .authorName(author.displayName())
                    .authorAvatarColor(author.avatarColor())
                    .stars(newStars)
                    .comment(normalizeComment(form.comment()))
                    .build();
        } else {
            review.setStars(newStars);
            review.setComment(normalizeComment(form.comment()));
        }
        review = reviews.save(review);
        applyReputationDelta(event.getOrganizerUserId(), oldStars, newStars, event.getTitle());
        return toDto(review, current);
    }

    private static String normalizeComment(String comment) {
        if (TextUtils.isBlank(comment)) {
            return null;
        }
        return comment.trim();
    }

    private void applyReputationDelta(Long organizerUserId, int oldStars, int newStars, String eventTitle) {
        int delta = ReputationPolicy.reviewDeltaForStars(newStars)
                - (oldStars == 0 ? 0 : ReputationPolicy.reviewDeltaForStars(oldStars));
        if (delta == 0) {
            return;
        }
        String reason = "Отзыв участника о «" + eventTitle + "»: " + newStars + " из 5";
        identity.applyReputationDelta(organizerUserId, delta, reason);
    }

    private EventReviewDto toDto(EventReview review, CurrentUser current) {
        return new EventReviewDto(
                review.getId(),
                review.getEventId(),
                review.getAuthorId(),
                review.getAuthorName(),
                review.getAuthorAvatarColor(),
                review.getStars(),
                review.getComment(),
                review.getCreatedAt(),
                review.getUpdatedAt(),
                current.isAuthenticated() && current.id().equals(review.getAuthorId())
        );
    }
}
