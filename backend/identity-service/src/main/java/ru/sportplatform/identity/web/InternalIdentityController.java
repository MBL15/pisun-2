package ru.sportplatform.identity.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.OrganizationDecisionRequest;
import ru.sportplatform.common.dto.OrganizationDto;
import ru.sportplatform.identity.service.OrganizationService;

/**
 * Межсервисные эндпоинты. Не проброшены через api-gateway, поэтому доступны только внутри сети сервисов.
 */
@RestController
@RequestMapping("/internal/organizations")
@RequiredArgsConstructor
public class InternalIdentityController {

    private final OrganizationService organizationService;

    @GetMapping("/{id}")
    public OrganizationDto get(@PathVariable Long id) {
        return organizationService.getInternal(id);
    }

    @PostMapping("/{id}/decision")
    public OrganizationDto decide(@PathVariable Long id, @RequestBody OrganizationDecisionRequest request) {
        return organizationService.decide(id, request);
    }
}
