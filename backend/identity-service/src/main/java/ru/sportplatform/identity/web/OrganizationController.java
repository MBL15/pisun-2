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
import ru.sportplatform.common.dto.OrganizationDto;
import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.identity.service.OrganizationService;
import ru.sportplatform.identity.web.dto.OrganizationForm;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    public List<OrganizationDto> list(CurrentUser user,
                                      @RequestParam(required = false) ApplicationStatus status,
                                      @RequestParam(required = false) String q) {
        return organizationService.list(user, status, q);
    }

    @GetMapping("/my")
    public OrganizationDto my(CurrentUser user) {
        return organizationService.my(user);
    }

    @GetMapping("/{id}")
    public OrganizationDto get(CurrentUser user, @PathVariable Long id) {
        return organizationService.get(user, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizationDto submit(CurrentUser user, @Valid @RequestBody OrganizationForm form) {
        return organizationService.submit(user, form);
    }

    @PutMapping("/{id}")
    public OrganizationDto update(CurrentUser user, @PathVariable Long id, @Valid @RequestBody OrganizationForm form) {
        return organizationService.update(user, id, form);
    }
}
