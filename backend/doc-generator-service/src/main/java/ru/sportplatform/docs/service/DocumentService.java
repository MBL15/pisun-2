package ru.sportplatform.docs.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.HtmlUtils;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.EventSnapshotDto;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.docs.client.DocClients;
import ru.sportplatform.docs.domain.DocumentTemplate;
import ru.sportplatform.docs.repository.DocumentTemplateRepository;
import ru.sportplatform.docs.web.dto.GeneratedDocument;
import ru.sportplatform.docs.web.dto.TemplateDto;
import ru.sportplatform.docs.web.dto.TemplateForm;

@Service
@RequiredArgsConstructor
public class DocumentService {

    public static final Map<String, String> PLACEHOLDERS = placeholders();

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*(\\w+)\\s*}}");
    private static final Locale RU = Locale.forLanguageTag("ru");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMMM yyyy 'г.'", RU);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", RU);
    private static final DateTimeFormatter NUMBER_DATE = DateTimeFormatter.ofPattern("yyMMdd");
    private static final String BLANK = "________________";

    private final DocumentTemplateRepository templates;
    private final DocClients clients;

    // ---------- шаблоны ----------

    @Transactional(readOnly = true)
    public List<TemplateDto> list() {
        return templates.findAllByOrderByIdAsc().stream().map(DocumentService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public TemplateDto get(String code) {
        return toDto(find(code));
    }

    @Transactional
    public TemplateDto update(CurrentUser current, String code, TemplateForm form) {
        current.requireAdmin();
        DocumentTemplate template = find(code);
        template.setName(form.name().trim());
        template.setDescription(form.description());
        template.setContent(form.content());
        template.setUpdatedBy("Администратор #" + current.id());
        return toDto(template);
    }

    /** Загрузка шаблона файлом (.html или .txt в UTF-8). */
    @Transactional
    public TemplateDto upload(CurrentUser current, String code, MultipartFile file) {
        current.requireAdmin();
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Выберите файл шаблона");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!name.endsWith(".html") && !name.endsWith(".htm") && !name.endsWith(".txt")) {
            throw ApiException.badRequest("Поддерживаются файлы .html и .txt");
        }
        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            if (name.endsWith(".txt")) {
                content = "<p>" + HtmlUtils.htmlEscape(content).replace("\n\n", "</p><p>").replace("\n", "<br>") + "</p>";
            }
            DocumentTemplate template = find(code);
            template.setContent(content);
            template.setUpdatedBy("Администратор #" + current.id() + " (файл " + file.getOriginalFilename() + ")");
            return toDto(template);
        } catch (IOException e) {
            throw ApiException.badRequest("Не удалось прочитать файл: " + e.getMessage());
        }
    }

    @Transactional
    public TemplateDto reset(CurrentUser current, String code) {
        current.requireAdmin();
        DefaultTemplates.Definition definition = DefaultTemplates.ALL.get(code);
        if (definition == null) {
            throw ApiException.notFound("Для шаблона " + code + " нет версии по умолчанию");
        }
        DocumentTemplate template = find(code);
        template.setName(definition.name());
        template.setDescription(definition.description());
        template.setContent(DefaultTemplates.load(definition));
        template.setUpdatedBy("Сброшен к стандартному");
        return toDto(template);
    }

    // ---------- генерация ----------

    /**
     * Подбирает шаблон (взрослый или согласие родителя), получает данные события и участников
     * у соседних сервисов и подставляет их в плейсхолдеры.
     */
    @Transactional(readOnly = true)
    public GeneratedDocument generate(CurrentUser viewer, Long eventId, Long userId, Long childId, String templateCode) {
        viewer.requireAuthenticated();
        if (userId == null) {
            throw ApiException.badRequest("Укажите userId — для кого формируется документ");
        }
        clients.checkEventVisible(viewer, eventId);
        EventSnapshotDto event = clients.event(eventId);
        boolean privileged = viewer.isAdmin() || viewer.id().equals(event.organizerUserId());
        if (!viewer.id().equals(userId) && !privileged) {
            throw ApiException.forbidden("Можно сформировать документ только для себя или для своего ребёнка");
        }
        UserDto user = clients.user(userId);

        UserDto child = null;
        UserDto parent = null;
        if (childId != null) {
            child = clients.user(childId);
            if (!isChildGuardian(user, child)) {
                throw ApiException.forbidden("Согласие может сформировать только родитель этого ребёнка");
            }
            parent = user;
        } else if (user.role() == RoleType.CHILD) {
            child = user;
            parent = user.parentId() == null ? null : clients.user(user.parentId());
        }

        String code = !TextUtils.isBlank(templateCode) ? templateCode
                : child != null ? DocumentTemplate.CHILD_CONSENT : DocumentTemplate.ADULT_APPLICATION;
        DocumentTemplate template = find(code);

        Map<String, String> values = new LinkedHashMap<>();
        values.put("eventTitle", event.title());
        values.put("sportType", event.sportName());
        values.put("eventDate", event.startAt() == null ? BLANK : DATE.format(event.startAt()));
        values.put("eventTime", event.startAt() == null ? BLANK : TIME.format(event.startAt()));
        values.put("location", event.address());
        values.put("organizerName", event.organizerName());
        values.put("conditions", TextUtils.isBlank(event.conditions()) ? "особых требований нет" : event.conditions());
        values.put("participantName", child != null ? child.displayName() : user.displayName());
        values.put("participantAge", ageOf(child != null ? child : user));
        values.put("childName", child == null ? "—" : child.displayName());
        values.put("childAge", child == null ? "—" : ageOf(child));
        values.put("parentName", parent == null ? BLANK : parent.displayName());
        values.put("currentDate", DATE.format(LocalDate.now()));
        values.put("documentNumber", "SV-%d-%d-%s".formatted(event.id(), (child != null ? child : user).id(),
                NUMBER_DATE.format(LocalDate.now())));

        String body = render(template.getContent(), values);
        String fileName = (child != null ? "soglasie" : "zayavlenie") + "-event-" + event.id() + ".html";
        return new GeneratedDocument(code, template.getName(), fileName, wrap(template.getName(), body));
    }

    static String render(String content, Map<String, String> values) {
        Matcher matcher = PLACEHOLDER.matcher(content);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String value = values.get(matcher.group(1));
            String replacement = value == null ? BLANK : HtmlUtils.htmlEscape(value);
            matcher.appendReplacement(out, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private static String wrap(String title, String body) {
        if (body.toLowerCase(Locale.ROOT).contains("<html")) {
            return body;
        }
        return """
                <!DOCTYPE html>
                <html lang="ru">
                <head>
                <meta charset="UTF-8">
                <title>%s</title>
                <style>
                  @page { size: A4; margin: 20mm; }
                  body { font-family: 'Times New Roman', Georgia, serif; font-size: 14pt; line-height: 1.5;
                         color: #111; background: #eef2f7; margin: 0; }
                  .sheet { background: #fff; max-width: 190mm; margin: 24px auto; padding: 20mm;
                           box-shadow: 0 4px 24px rgba(15,23,42,.12); }
                  .addressee { margin-left: 50%%; margin-bottom: 28px; }
                  h1 { text-align: center; font-size: 18pt; margin: 0; letter-spacing: 2px; }
                  .subtitle { text-align: center; margin: 4px 0 24px; }
                  p { text-align: justify; margin: 0 0 12px; }
                  .signature { width: 100%%; margin-top: 36px; border-collapse: collapse; }
                  .signature td { padding: 8px 0; }
                  .signature td:last-child { text-align: right; }
                  .meta { margin-top: 32px; font-size: 10pt; color: #64748b; text-align: left; }
                  .toolbar { position: sticky; top: 0; display: flex; gap: 12px; justify-content: center; padding: 12px;
                             background: #0f172a; font-family: system-ui, sans-serif; }
                  .toolbar button { font-size: 16px; padding: 10px 20px; border-radius: 10px; border: 0; cursor: pointer;
                                    background: #22c55e; color: #fff; font-weight: 600; }
                  @media print { body { background: #fff; } .toolbar { display: none; }
                                 .sheet { box-shadow: none; margin: 0; padding: 0; max-width: none; } }
                </style>
                </head>
                <body>
                <div class="toolbar"><button onclick="window.print()">Печать / сохранить в PDF</button></div>
                <div class="sheet">
                %s
                </div>
                </body>
                </html>
                """.formatted(HtmlUtils.htmlEscape(title), body);
    }

    private static String ageOf(UserDto user) {
        return user.age() == null ? BLANK : String.valueOf(user.age());
    }

    private DocumentTemplate find(String code) {
        return templates.findByCode(code)
                .orElseThrow(() -> ApiException.notFound("Шаблон " + code + " не найден"));
    }

    private static TemplateDto toDto(DocumentTemplate t) {
        return new TemplateDto(t.getId(), t.getCode(), t.getName(), t.getDescription(), t.getContent(),
                t.getUpdatedBy(), t.getUpdatedAt());
    }

    private static boolean isChildGuardian(UserDto adult, UserDto child) {
        if (child.role() != RoleType.CHILD) {
            return false;
        }
        if (adult.id().equals(child.parentId())) {
            return true;
        }
        return adult.familyId() != null && adult.familyId().equals(child.familyId());
    }

    private static Map<String, String> placeholders() {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("eventTitle", "Название мероприятия");
        map.put("sportType", "Спортивное направление");
        map.put("eventDate", "Дата проведения");
        map.put("eventTime", "Время начала");
        map.put("location", "Адрес проведения");
        map.put("organizerName", "Организатор (человек или организация)");
        map.put("conditions", "Условия участия");
        map.put("participantName", "Участник");
        map.put("participantAge", "Возраст участника");
        map.put("childName", "Имя ребёнка");
        map.put("childAge", "Возраст ребёнка");
        map.put("parentName", "Родитель / законный представитель");
        map.put("currentDate", "Дата формирования документа");
        map.put("documentNumber", "Номер документа");
        return map;
    }
}
