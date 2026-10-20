package ru.sportplatform.identity.web;

import java.util.List;
import java.util.Set;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.identity.service.FriendshipService;

@RestController
@RequestMapping("/internal/friendship")
@RequiredArgsConstructor
public class InternalFriendshipController {

    private final FriendshipService friendship;

    @GetMapping("/users/{id}/friend-ids")
    public List<Long> friendIds(@PathVariable Long id) {
        Set<Long> ids = friendship.friendIds(id);
        return ids.stream().sorted().toList();
    }

    @GetMapping("/check")
    public boolean check(@RequestParam Long a, @RequestParam Long b) {
        return friendship.areFriends(a, b);
    }
}
