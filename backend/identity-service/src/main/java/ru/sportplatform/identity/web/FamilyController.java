package ru.sportplatform.identity.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.FamilyDto;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.identity.service.FamilyService;
import ru.sportplatform.identity.web.dto.AddSpouseRequest;
import ru.sportplatform.identity.web.dto.CreateFamilyRequest;

@RestController
@RequestMapping("/api/families")
@RequiredArgsConstructor
public class FamilyController {

    private final FamilyService familyService;

    @GetMapping("/my")
    public FamilyDto mine(CurrentUser user) {
        return familyService.mine(user);
    }

    @GetMapping("/eligible-spouses")
    public List<UserDto> eligibleSpouses(CurrentUser user) {
        return familyService.eligibleSpouses(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FamilyDto create(CurrentUser user, @Valid @RequestBody CreateFamilyRequest request) {
        return familyService.create(user, request.spouseUserId());
    }

    @PostMapping("/spouse")
    public FamilyDto addSpouse(CurrentUser user, @Valid @RequestBody AddSpouseRequest request) {
        return familyService.addSpouse(user, request.spouseUserId());
    }

    /** Приглашения в семью, адресованные текущему пользователю. */
    @GetMapping("/invitations")
    public List<FamilyDto> invitations(CurrentUser user) {
        return familyService.invitations(user);
    }

    @PostMapping("/{id}/spouse/accept")
    public FamilyDto acceptInvitation(CurrentUser user, @PathVariable Long id) {
        return familyService.acceptInvitation(user, id);
    }

    @PostMapping("/{id}/spouse/decline")
    public FamilyDto declineInvitation(CurrentUser user, @PathVariable Long id) {
        return familyService.declineInvitation(user, id);
    }
}
