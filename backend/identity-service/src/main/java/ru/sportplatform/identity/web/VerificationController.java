package ru.sportplatform.identity.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.enums.VerificationRequestStatus;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.identity.service.VerificationService;
import ru.sportplatform.identity.web.dto.VerificationRequestDto;
import ru.sportplatform.identity.web.dto.VerificationRequestForm;

@RestController
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verification;

    @PostMapping("/api/users/me/verification-request")
    @ResponseStatus(HttpStatus.CREATED)
    public VerificationRequestDto submit(CurrentUser user, @Valid @RequestBody VerificationRequestForm form) {
        return verification.submit(user, form);
    }

    @GetMapping("/api/users/me/verification-request")
    public VerificationRequestDto myLatest(CurrentUser user) {
        return verification.myLatest(user);
    }

    @GetMapping("/api/verification-requests")
    public List<VerificationRequestDto> listAdmin(CurrentUser user,
                                                    @RequestParam(required = false) VerificationRequestStatus status) {
        return verification.listAdmin(user, status);
    }

    @PostMapping("/api/verification-requests/{id}/approve")
    public VerificationRequestDto approve(CurrentUser user, @PathVariable Long id) {
        return verification.approve(user, id);
    }

    @PostMapping("/api/verification-requests/{id}/reject")
    public VerificationRequestDto reject(CurrentUser user, @PathVariable Long id, @RequestBody RejectBody body) {
        return verification.reject(user, id, body.reason());
    }

    public record RejectBody(String reason) {
    }
}
