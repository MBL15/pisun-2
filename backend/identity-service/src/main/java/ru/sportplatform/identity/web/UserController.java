package ru.sportplatform.identity.web;

import java.util.List;

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
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.identity.service.UserService;
import ru.sportplatform.identity.web.dto.ChildRequest;
import ru.sportplatform.identity.web.dto.ProfileUpdateRequest;
import ru.sportplatform.identity.web.dto.RegisterRequest;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** Список аккаунтов для экрана входа и переключателя ролей. */
    @GetMapping
    public List<UserDto> list(@RequestParam(defaultValue = "false") boolean demo) {
        return userService.list(demo);
    }

    @GetMapping("/{id}")
    public UserDto get(CurrentUser viewer, @PathVariable Long id) {
        return userService.get(viewer, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto register(@Valid @RequestBody RegisterRequest request) {
        return userService.register(request);
    }

    @PutMapping("/{id}")
    public UserDto update(CurrentUser user, @PathVariable Long id, @Valid @RequestBody ProfileUpdateRequest request) {
        return userService.updateProfile(user, id, request);
    }

    @GetMapping("/{id}/children")
    public List<UserDto> children(@PathVariable Long id) {
        return userService.children(id);
    }

    @PostMapping("/{id}/children")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto addChild(CurrentUser user, @PathVariable Long id, @Valid @RequestBody ChildRequest request) {
        return userService.addChild(user, id, request);
    }
}
