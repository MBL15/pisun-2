package ru.sportplatform.identity.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.ReputationDeltaRequest;
import ru.sportplatform.common.dto.ReputationPenaltyRequest;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.identity.service.ReputationService;
import ru.sportplatform.identity.service.UserService;

/** Межсервисные операции с аккаунтами (репутация). */
@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserService userService;
    private final ReputationService reputationService;

    @GetMapping("/{id}")
    public UserDto get(@PathVariable Long id) {
        return userService.getInternal(id);
    }

    @PostMapping("/{id}/reputation/moderation-penalty")
    public UserDto moderationPenalty(@PathVariable Long id, @RequestBody ReputationPenaltyRequest request) {
        return reputationService.penalizeForModeration(id, request.reason());
    }

    @PostMapping("/{id}/reputation/delta")
    public UserDto reputationDelta(@PathVariable Long id, @RequestBody ReputationDeltaRequest request) {
        return reputationService.applyDelta(id, request.delta(), request.reason());
    }
}
