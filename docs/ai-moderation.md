# ИИ-модерация

Код: `backend/ai-moderation-service/src/main/java/ru/sportplatform/moderation/`.

Режим `DRAFT` (`EventVerificationRequest.mode`) используется формой мероприятия: вердикт считается, подсказки возвращаются, но строка в `ai_verdicts` не пишется. Каждый вызов, включая черновик, попадает в `ai_audit_log` (агент, вердикт, источник `HEURISTIC` / `LLM` / `MERGED`, время).

Хранитель качества (`GuardianAdvisor`) добавляет к вердикту замечания по полям и прогноз возраста. Сохранение он не блокирует. Детское событие пользователя всё равно не попадает в афишу без администратора — это делает event-service, а не кнопка на форме.

Куратор справочника живёт в event-service (`SportCuratorService`): подсказки `/api/sports/suggest`, заявка `/api/sports/propose`, слияния и метрики для админки. Похожие названия ищет свой компаратор (Левенштейн, токены, общий префикс). Библиотека Soundex для кириллицы не используется: «футбик» и «футбол» она не сближает. Если задан ключ LLM, куратор дополнительно спрашивает модель, адекватен ли новый вид; без ключа решает эвристика.

## Поток проверки события

```mermaid
sequenceDiagram
  participant EV as event-service
  participant AI as AiVerificationService
  participant H as HeuristicAnalyzer
  participant L as LlmClient
  EV->>AI: POST /api/ai/verify-event
  AI->>AI: SettingsService.current()
  alt ИИ выключен
    AI-->>EV: AI_APPROVED, source=DISABLED
  else ИИ включён
    AI->>H: analyzeEvent(...)
    opt llmEnabled и задан ключ
      AI->>L: verify(...)
    end
    AI->>AI: слияние, сохранение AiVerdict
    AI-->>EV: EventVerificationResult
  end
  EV->>EV: applyVerdict → организация PUBLISHED, пользователь ON_REVIEW
```

## Два агента

| Агент | Где живёт | Публичные вызовы | Задача |
|---|---|---|---|
| **Хранитель качества** | ai-moderation-service (`GuardianAdvisor`, `AiVerificationService`) | `POST /api/ai/verify-event`, `POST /api/ai/improve-event`, `GET /api/ai/guardian/report` | Вердикт, возраст, `AgentSuggestion` на форме, варианты текста, сводка за сутки |
| **Куратор справочника** | event-service (`SportCuratorService`, `FuzzySportMatcher`) | `GET /api/sports/suggest`, `POST /api/sports/propose`, `GET /api/sports/metrics`, `GET /api/sports/merge-proposals` | Реестр `SportLexicon`, заявка «своего» вида, метрики и пары для слияния |

Эвристики работают без ключей. LLM подключается через `AI_LLM_API_KEY` для вердикта события и (опционально) для оценки нового вида спорта (`POST /api/ai/curate-sport` из event-service).

### Журнал `ai_audit_log`

Таблица в ai-moderation-service. Пишется через `POST /api/ai/audit` (вызывает event-service после авто-снятия и при каждой проверке). Поля: агент (`GUARDIAN`, `CURATOR`…), действие (`VERIFY`, `VERIFY_DRAFT`, `UNPUBLISH`…), вердикт, источник (`HEURISTIC`, `LLM`, `MERGED`, `FALLBACK`), деталь, время. Черновик формы (`mode=DRAFT`) в `ai_verdicts` не сохраняется, но в аудит попадает.

### Подсказки `AgentSuggestion`

Record в `common-lib`: `type` (например `SPORT_MISMATCH`, `CHILD_TRIGGER`), `field`, `message`, `confidence`, `blocking`. Возвращаются в `EventVerificationResult.suggestions`. На форме их показывает `AgentHintsPanel`; сохранение события они не блокируют — решение об афише принимает `applyVerdict`.

### Админка «Агенты»

- **Хранитель:** число проверок, флагов и авто-снятий за сутки, топ причин, подсказка по комментариям; кнопка скрыть все видимые комментарии с вердиктом ИИ (`POST /api/moderation/comments/hide-flagged`).
- **Куратор:** топ направлений, новые виды за 7 дней, «сироты» без событий 90+ дней; список предложений слияния с кнопкой «Слить» → `POST /api/moderation/sports/merge` (журнал `SPORT_MERGED`).

## Правила слияния вердиктов

`AiVerificationService.verifyEvent`:

- `flagged` — нарушение нашёл хотя бы один анализатор.
- `adultOnly` — эвристика нашла взрослые маркеры, **или** есть нарушение, **или** LLM считает, что событие не для детей. Итог: «безопасно для детей» только при согласии обоих анализаторов.
- `hold = flagged && autoHoldFlagged`. В `applyVerdict` поле `hold` не переключает статус: пользовательские события и так создаются в `ON_REVIEW`, организационные при создании всегда `PUBLISHED`.
- Причины LLM добавляются с префиксом `LLM:`. К причинам добавляются взрослые или детские маркеры, в зависимости от итоговой метки.
- `source`: `HEURISTIC`, `LLM+HEURISTIC`, `DISABLED`; event-service при недоступности сервиса подставляет `FALLBACK`.
- Каждый вердикт сохраняется в `ai_verdicts`. Лента в админке показывает последние 100.

## Эвристика

`HeuristicAnalyzer` работает на регулярных выражениях с флагами `CASE_INSENSITIVE | UNICODE_CASE | UNICODE_CHARACTER_CLASS`. Благодаря `UNICODE_CHARACTER_CLASS` граница `\b` корректно работает для кириллицы.

Анализируется текст «название + описание + условия».

| Группа | Что ищет | Результат |
|---|---|---|
| `FORBIDDEN` | 8 категорий: ставки, алкоголь, наркотики, оружие и насилие, мошенничество, персональные данные, мат, дискриминация | `flagged` |
| Стоп-слова администратора | Подстроки из настроек (разделители `,` `;` и перевод строки, минимум 2 символа, сравнение после `normalizeKey`) | `flagged` |
| `ADULT_MARKERS` | 18+, «только для взрослых», бар, ночной, спарринг, единоборства, контактные виды, сауна | 18+ |
| Позднее время | Начало с 22:00 до 06:00 | 18+ |
| Аудитория `ADULTS` | Выбор организатора | 18+ |
| `KIDS_MARKERS`, аудитория `KIDS` | Дети, ребёнок, школьники, семейный, «для всей семьи», «семья/семьёй», «N лет», «6+», двор, подростки | Только причины для детской метки, флаг не ставится |
| Рекомендации | Короткое описание (меньше 40 символов), нет условий, КАПС или «!!!» в названии, телефон или ссылка в описании | Подсказки на карточке, на статус не влияют |

На одну категорию сохраняется не больше 5 совпадений.

### Комментарии

`analyzeComment` проверяет только категории с `forComments = true` (алкоголь не проверяется), стоп-слова и спам — больше двух ссылок. Комментарий скрывается, если найдено нарушение и включён `commentFilterEnabled`. Если фильтр выключен, вердикт возвращается с `flagged = true`, но `autoHide = false`.

### Как добавить категорию или маркер

1. Добавьте `category("Название", forComments, "regex1", ...)` в `FORBIDDEN` или шаблон в `ADULT_MARKERS` или `KIDS_MARKERS`.
2. Используйте `\b` и окончания `\w*`, чтобы не ловить части других слов: «ставк» не должно срабатывать в «выставка».
3. Проверьте ложные срабатывания на демо-событиях. Например, создайте событие с текстом-приманкой и посмотрите ленту вердиктов в админке.

Автотестов на эвристику пока нет (см. [known-issues.md](known-issues.md)), поэтому проверять приходится вручную.

## LLM

`LlmClient` подходит для любого OpenAI-совместимого API `/chat/completions`.

| Переменная | По умолчанию |
|---|---|
| `AI_LLM_API_KEY` | пусто, LLM не используется |
| `AI_LLM_BASE_URL` | `https://api.openai.com/v1` |
| `AI_LLM_MODEL` | `gpt-4o-mini` |
| `AI_LLM_TIMEOUT` | 10 секунд |

- `temperature = 0`, системный промпт требует ответить JSON `{flagged, childSafe, summary, reasons}`.
- Из ответа берётся подстрока от первой `{` до последней `}`, поэтому Markdown-обёртка в ответе модели не мешает.
- При ошибке, таймауте или невалидном JSON используется только эвристика. Ошибка пишется в лог с уровнем `warn`.
- LLM проверяет только события, комментарии она не проверяет.

## Настройки

`ModerationSettings` — единственная строка в `moderation_settings`, создаётся при первом обращении (`SettingsService.current`).

| Поле | По умолчанию | Эффект |
|---|---|---|
| `aiEnabled` | `true` | Выключено: события получают `AI_APPROVED` без проверки, комментарии не фильтруются |
| `autoHoldFlagged` | `true` | Придерживать ли события пользователей с `FLAGGED` |
| `llmEnabled` | `true` | Вызывать ли LLM (только если задан ключ) |
| `commentFilterEnabled` | `true` | Автоматически скрывать комментарии с нарушениями |
| `customStopWords` | пусто | Дополнительные стоп-слова |

Изменение настроек записывается в журнал как `SETTINGS_CHANGED`. Настройки читают и меняют только администраторы. В ответе `SettingsDto` есть `llmConfigured` и `model`, по ним админка показывает, подключена ли LLM.
