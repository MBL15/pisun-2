package ru.sportplatform.identity.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.identity.service.FriendshipService;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendshipService friendship;

    @GetMapping
    public List<UserDto> list(CurrentUser user) {
        return friendship.friends(user);
    }

    @GetMapping("/incoming")
    public List<UserDto> incoming(CurrentUser user) {
        return friendship.incoming(user);
    }

    @GetMapping("/search")
    public List<UserDto> search(CurrentUser user, @RequestParam String q) {
        return friendship.search(user, q);
    }

    @PostMapping("/requests/{toUserId}")
    public UserDto send(CurrentUser user, @PathVariable Long toUserId) {
        return friendship.sendRequest(user, toUserId);
    }

    @PostMapping("/requests/{fromUserId}/accept")
    public UserDto accept(CurrentUser user, @PathVariable Long fromUserId) {
        return friendship.accept(user, fromUserId);
    }

    @PostMapping("/requests/{fromUserId}/reject")
    public void reject(CurrentUser user, @PathVariable Long fromUserId) {
        friendship.reject(user, fromUserId);
    }
}
