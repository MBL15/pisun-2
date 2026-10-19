package ru.sportplatform.event.web;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.CommentSnapshotDto;
import ru.sportplatform.common.dto.CommentVisibilityRequest;
import ru.sportplatform.common.dto.EventSnapshotDto;
import ru.sportplatform.common.dto.EventStatusChangeRequest;
import ru.sportplatform.event.service.CommentService;
import ru.sportplatform.event.service.EventService;

/** Межсервисные эндпоинты (не проброшены через api-gateway). */
@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
public class InternalEventController {

    private final EventService eventService;
    private final CommentService commentService;

    @GetMapping("/events/{id}")
    public EventSnapshotDto event(@PathVariable Long id) {
        return eventService.snapshot(id);
    }

    @PostMapping("/events/{id}/status")
    public EventSnapshotDto changeStatus(@PathVariable Long id, @RequestBody EventStatusChangeRequest request) {
        return eventService.changeStatus(id, request);
    }

    @GetMapping("/comments/{id}")
    public CommentSnapshotDto comment(@PathVariable Long id) {
        return commentService.snapshot(id);
    }

    @PostMapping("/comments/{id}/visibility")
    public CommentSnapshotDto visibility(@PathVariable Long id, @RequestBody CommentVisibilityRequest request) {
        return commentService.setVisibility(id, request);
    }

    @DeleteMapping("/comments/{id}")
    public CommentSnapshotDto delete(@PathVariable Long id) {
        return commentService.deleteByModerator(id);
    }
}
