package ru.sportplatform.event.web;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.enums.RegistrationMode;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.event.service.CommentService;
import ru.sportplatform.event.service.EventFilter;
import ru.sportplatform.event.service.EventService;
import ru.sportplatform.event.service.RegistrationService;
import ru.sportplatform.event.service.ReviewService;
import ru.sportplatform.event.web.dto.CommentDto;
import ru.sportplatform.event.web.dto.CommentForm;
import ru.sportplatform.event.web.dto.DecisionRequest;
import ru.sportplatform.event.web.dto.EventDto;
import ru.sportplatform.event.web.dto.EventForm;
import ru.sportplatform.event.web.dto.MyRegistrationDto;
import ru.sportplatform.event.web.dto.RegistrationDto;
import ru.sportplatform.event.web.dto.EventReviewDto;
import ru.sportplatform.event.web.dto.EventReviewForm;
import ru.sportplatform.event.web.dto.RegistrationRequest;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final RegistrationService registrationService;
    private final CommentService commentService;
    private final ReviewService reviewService;

    @GetMapping
    public List<EventDto> list(CurrentUser user,
                               @RequestParam(required = false) String q,
                               @RequestParam(required = false) Long sportTypeId,
                               @RequestParam(required = false) RegistrationMode mode,
                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                               @RequestParam(required = false) Boolean childSafe,
                               @RequestParam(required = false) Long organizationId,
                               @RequestParam(required = false) Long organizerUserId,
                               @RequestParam(defaultValue = "public") String scope,
                               @RequestParam(required = false) EventStatus status,
                               @RequestParam(defaultValue = "false") boolean includePast) {
        return eventService.list(user, new EventFilter(q, sportTypeId, mode, from, to, childSafe,
                organizationId, organizerUserId, scope, status, includePast));
    }

    @GetMapping("/my")
    public List<EventDto> mine(CurrentUser user) {
        return eventService.mine(user);
    }

    @GetMapping("/registrations/my")
    public List<MyRegistrationDto> myRegistrations(CurrentUser user) {
        return registrationService.mine(user);
    }

    @GetMapping("/{id}")
    public EventDto get(CurrentUser user, @PathVariable Long id) {
        return eventService.get(user, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventDto create(CurrentUser user, @Valid @RequestBody EventForm form) {
        return eventService.create(user, form);
    }

    @PutMapping("/{id}")
    public EventDto update(CurrentUser user, @PathVariable Long id, @Valid @RequestBody EventForm form) {
        return eventService.update(user, id, form);
    }

    // ----- записи и заявки -----

    @GetMapping("/{id}/registrations")
    public List<RegistrationDto> registrations(CurrentUser user, @PathVariable Long id) {
        return registrationService.listForEvent(user, id);
    }

    @PostMapping("/{id}/registrations")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistrationDto register(CurrentUser user, @PathVariable Long id,
                                    @Valid @RequestBody(required = false) RegistrationRequest request) {
        return registrationService.register(user, id, request);
    }

    @PostMapping("/{id}/registrations/{registrationId}/decision")
    public RegistrationDto decide(CurrentUser user, @PathVariable Long id, @PathVariable Long registrationId,
                                  @Valid @RequestBody DecisionRequest request) {
        return registrationService.decide(user, id, registrationId, request);
    }

    @PostMapping("/{id}/registrations/{registrationId}/cancel")
    public RegistrationDto cancel(CurrentUser user, @PathVariable Long id, @PathVariable Long registrationId) {
        return registrationService.cancel(user, id, registrationId);
    }

    // ----- обсуждение -----

    @GetMapping("/{id}/comments")
    public List<CommentDto> comments(CurrentUser user, @PathVariable Long id) {
        return commentService.list(user, id);
    }

    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentDto addComment(CurrentUser user, @PathVariable Long id, @Valid @RequestBody CommentForm form) {
        return commentService.add(user, id, form);
    }

    // ----- отзывы участников -----

    @GetMapping("/{id}/reviews")
    public List<EventReviewDto> reviews(CurrentUser user, @PathVariable Long id) {
        return reviewService.list(user, id);
    }

    @PostMapping("/{id}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public EventReviewDto upsertReview(CurrentUser user, @PathVariable Long id, @Valid @RequestBody EventReviewForm form) {
        return reviewService.upsert(user, id, form);
    }
}
