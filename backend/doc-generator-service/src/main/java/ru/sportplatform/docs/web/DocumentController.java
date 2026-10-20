package ru.sportplatform.docs.web;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.docs.service.DocumentService;
import ru.sportplatform.docs.web.dto.GeneratedDocument;
import ru.sportplatform.docs.web.dto.TemplateDto;
import ru.sportplatform.docs.web.dto.TemplateForm;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    /**
     * Готовый документ для предпросмотра (можно открыть во фрейме или новой вкладке) и печати.
     * download=true — отдать файлом.
     */
    @GetMapping("/generate/{eventId}")
    public ResponseEntity<String> generate(CurrentUser user,
                                           @PathVariable Long eventId,
                                           @RequestParam Long userId,
                                           @RequestParam(required = false) Long childId,
                                           @RequestParam(required = false) String template,
                                           @RequestParam(defaultValue = "false") boolean download) {
        GeneratedDocument document = documentService.generate(user, eventId, userId, childId, template);
        ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8));
        if (download) {
            response.header(HttpHeaders.CONTENT_DISPOSITION,
                    ContentDisposition.attachment().filename(document.fileName()).build().toString());
        }
        return response.body(document.html());
    }

    @GetMapping("/preview/{eventId}")
    public GeneratedDocument preview(CurrentUser user,
                                     @PathVariable Long eventId,
                                     @RequestParam Long userId,
                                     @RequestParam(required = false) Long childId,
                                     @RequestParam(required = false) String template) {
        return documentService.generate(user, eventId, userId, childId, template);
    }

    @GetMapping("/placeholders")
    public Map<String, String> placeholders() {
        return DocumentService.PLACEHOLDERS;
    }

    @GetMapping("/templates")
    public List<TemplateDto> templates() {
        return documentService.list();
    }

    @GetMapping("/templates/{code}")
    public TemplateDto template(@PathVariable String code) {
        return documentService.get(code);
    }

    @PutMapping("/templates/{code}")
    public TemplateDto update(CurrentUser user, @PathVariable String code, @Valid @RequestBody TemplateForm form) {
        return documentService.update(user, code, form);
    }

    @PostMapping(value = "/templates/{code}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TemplateDto upload(CurrentUser user, @PathVariable String code, @RequestPart("file") MultipartFile file) {
        return documentService.upload(user, code, file);
    }

    @PostMapping("/templates/{code}/reset")
    public TemplateDto reset(CurrentUser user, @PathVariable String code) {
        return documentService.reset(user, code);
    }
}
