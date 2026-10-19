package ru.sportplatform.common.dto;

public record CommentSnapshotDto(
        Long id,
        Long eventId,
        String eventTitle,
        Long authorId,
        String authorName,
        String text,
        boolean hidden
) {
}
