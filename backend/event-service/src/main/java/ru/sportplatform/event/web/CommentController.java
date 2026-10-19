package ru.sportplatform.event.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.event.service.CommentService;
import ru.sportplatform.event.web.dto.CommentDto;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /** Все сообщения платформы — для вкладки модерации обсуждений. */
    @GetMapping
    public List<CommentDto> list(CurrentUser user,
                                 @RequestParam(required = false) Boolean hidden,
                                 @RequestParam(required = false) String q) {
        return commentService.adminList(user, hidden, q);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(CurrentUser user, @PathVariable Long id) {
        commentService.deleteOwn(user, id);
    }
}
