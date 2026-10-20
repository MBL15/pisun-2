package ru.sportplatform.identity.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.dto.VerificationAttachmentDto;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.enums.VerificationRequestStatus;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.identity.domain.UserAccount;
import ru.sportplatform.identity.domain.VerificationRequest;
import ru.sportplatform.identity.repository.UserAccountRepository;
import ru.sportplatform.identity.repository.VerificationRequestRepository;
import ru.sportplatform.identity.web.dto.VerificationRequestDto;
import ru.sportplatform.identity.web.dto.VerificationRequestForm;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationService {

    private static final int MAX_ATTACHMENTS = 5;
    private static final int MAX_ATTACHMENT_CHARS = 700_000;

    private final VerificationRequestRepository requests;
    private final UserAccountRepository users;
    private final ObjectMapper objectMapper;

    @Transactional
    public VerificationRequestDto submit(CurrentUser current, VerificationRequestForm form) {
        current.requireAuthenticated();
        UserAccount user = users.findById(current.id()).orElseThrow();
        if (user.getRole() != RoleType.USER) {
            throw ApiException.badRequest("Верификация доступна только для личных аккаунтов пользователей");
        }
        if (user.isVerified()) {
            throw ApiException.conflict("У вас уже есть галочка верификации");
        }
        if (requests.existsByUserIdAndStatus(user.getId(), VerificationRequestStatus.PENDING)) {
            throw ApiException.conflict("Заявка уже на рассмотрении — дождитесь решения администратора");
        }
        List<VerificationAttachmentDto> attachments = normalizeAttachments(form.attachments());
        VerificationRequest entity = VerificationRequest.builder()
                .userId(user.getId())
                .message(form.message().trim())
                .attachmentsJson(writeJson(attachments))
                .status(VerificationRequestStatus.PENDING)
                .build();
        return toDto(requests.save(entity));
    }

    @Transactional(readOnly = true)
    public VerificationRequestDto myLatest(CurrentUser current) {
        current.requireAuthenticated();
        return requests.findFirstByUserIdOrderByCreatedAtDesc(current.id()).map(this::toDto).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<VerificationRequestDto> listAdmin(CurrentUser current, VerificationRequestStatus status) {
        current.requireAdmin();
        VerificationRequestStatus filter = status == null ? VerificationRequestStatus.PENDING : status;
        return requests.findByStatusOrderByCreatedAtDesc(filter).stream().map(this::toDto).toList();
    }

    @Transactional
    public VerificationRequestDto approve(CurrentUser admin, Long id) {
        admin.requireAdmin();
        VerificationRequest req = find(id);
        if (req.getStatus() != VerificationRequestStatus.PENDING) {
            throw ApiException.conflict("Заявка уже обработана");
        }
        UserAccount user = users.findById(req.getUserId()).orElseThrow();
        user.setVerified(true);
        req.setStatus(VerificationRequestStatus.APPROVED);
        req.setReviewedBy(reviewerName(admin));
        req.setReviewedAt(Instant.now());
        return toDto(req);
    }

    @Transactional
    public VerificationRequestDto reject(CurrentUser admin, Long id, String reason) {
        admin.requireAdmin();
        if (TextUtils.isBlank(reason)) {
            throw ApiException.badRequest("Укажите причину отказа");
        }
        VerificationRequest req = find(id);
        if (req.getStatus() != VerificationRequestStatus.PENDING) {
            throw ApiException.conflict("Заявка уже обработана");
        }
        req.setStatus(VerificationRequestStatus.REJECTED);
        req.setRejectionReason(reason.trim());
        req.setReviewedBy(reviewerName(admin));
        req.setReviewedAt(Instant.now());
        return toDto(req);
    }

    private VerificationRequest find(Long id) {
        return requests.findById(id).orElseThrow(() -> ApiException.notFound("Заявка не найдена"));
    }

    private VerificationRequestDto toDto(VerificationRequest req) {
        String name = users.findById(req.getUserId()).map(UserAccount::getDisplayName).orElse("—");
        return new VerificationRequestDto(
                req.getId(),
                req.getUserId(),
                name,
                req.getMessage(),
                readJson(req.getAttachmentsJson()),
                req.getStatus(),
                req.getRejectionReason(),
                req.getReviewedBy(),
                req.getCreatedAt(),
                req.getReviewedAt()
        );
    }

    private List<VerificationAttachmentDto> normalizeAttachments(List<VerificationAttachmentDto> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        if (raw.size() > MAX_ATTACHMENTS) {
            throw ApiException.badRequest("Можно прикрепить не больше " + MAX_ATTACHMENTS + " файлов");
        }
        return raw.stream()
                .filter(a -> a != null && !TextUtils.isBlank(a.fileName()) && !TextUtils.isBlank(a.contentBase64()))
                .peek(a -> {
                    if (a.contentBase64().length() > MAX_ATTACHMENT_CHARS) {
                        throw ApiException.badRequest("Файл «" + a.fileName() + "» слишком большой");
                    }
                })
                .toList();
    }

    private String writeJson(List<VerificationAttachmentDto> attachments) {
        try {
            return objectMapper.writeValueAsString(attachments);
        } catch (Exception e) {
            log.warn("attachments json: {}", e.getMessage());
            return "[]";
        }
    }

    private List<VerificationAttachmentDto> readJson(String json) {
        if (TextUtils.isBlank(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception e) {
            return List.of();
        }
    }

    private String reviewerName(CurrentUser admin) {
        return users.findById(admin.id()).map(UserAccount::getDisplayName).orElse("Администратор");
    }
}
