package ru.sportplatform.event.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.policy.ProhibitedContentScanner;
import ru.sportplatform.event.domain.SportEvent;
import ru.sportplatform.event.repository.EventCommentRepository;
import ru.sportplatform.event.repository.EventFriendInviteRepository;
import ru.sportplatform.event.repository.EventReviewRepository;
import ru.sportplatform.event.repository.RegistrationRepository;
import ru.sportplatform.event.repository.SportEventRepository;

/** Удаляет из БД события с «дроч…» в тексте (в т.ч. «дрочильня») — без ИИ. */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class OffensiveEventCleanup implements ApplicationRunner {

    private final SportEventRepository events;
    private final RegistrationRepository registrations;
    private final EventCommentRepository comments;
    private final EventReviewRepository reviews;
    private final EventFriendInviteRepository invites;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var remove = events.findAll().stream()
                .filter(e -> ProhibitedContentScanner.mentionsDroch(e.getTitle(), e.getDescription(), e.getConditions()))
                .map(SportEvent::getId)
                .toList();
        for (Long id : remove) {
            reviews.deleteAll(reviews.findByEventIdOrderByCreatedAtDesc(id));
            comments.deleteAll(comments.findByEventIdOrderByCreatedAtAsc(id));
            registrations.deleteAll(registrations.findByEventIdOrderByCreatedAtAsc(id));
            invites.deleteAll(invites.findByEventId(id));
            events.deleteById(id);
        }
        if (!remove.isEmpty()) {
            log.info("Purged {} event(s) containing prohibited wording (дроч…)", remove.size());
        }
    }
}
