package ru.sportplatform.common.dto;

/** Слияние вида спорта: все события source переносятся на target, source удаляется. */
public record SportMergeRequest(Long sourceId, Long targetId) {
}
