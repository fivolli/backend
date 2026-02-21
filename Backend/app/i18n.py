from __future__ import annotations

import contextvars
from typing import Any, Dict, Optional

from fastapi import Request


_supported = {"ru", "en", "ky"}
_current_lang: contextvars.ContextVar[str] = contextvars.ContextVar("tayan_lang", default="ru")


I18N: Dict[str, Dict[str, str]] = {
    "ru": {
        "auth.unauthorized": "Не авторизован",
        "auth.forbidden": "Доступ запрещён",
        "auth.phone_taken": "Телефон уже зарегистрирован",
        "auth.invalid_role": "role должен быть user или volunteer",
        "auth.invalid_credentials": "Неверный телефон или пароль",
        "request.invalid_kind": "kind должен быть sos или symptom",
        "request.volunteer_only_sos": "Волонтёры могут создавать только SOS-заявки",
        "request.not_found": "Не найдено",
        "request.status_invalid": "Недопустимый статус",
        "request.already_handled": "Заявка уже обработана волонтёром",
        "review.only_completed": "Отзыв можно оставить только для завершённых заявок",
        "review.no_volunteer": "Для заявки не назначен волонтёр",
        "review.rating_range": "Оценка должна быть от 1 до 5",
        "review.already_submitted": "Отзыв уже отправлен",
        "volunteer.active_request_exists": "У вас уже есть активная заявка",
        "volunteer.request_not_new": "Заявка уже не новая",
        "volunteer.status_invalid": "Недопустимый статус",
        "volunteer.request_closed": "Заявка уже закрыта",
        "volunteer.must_accept_first": "Сначала нужно принять заявку",
        "volunteer.transition_from_accepted": "Из accepted можно перейти только в in_progress или canceled",
        "volunteer.transition_from_in_progress": "Из in_progress можно перейти только в completed или canceled",
        "validation.error": "Невалидные данные запроса",
        "chat.forbidden": "Доступ к чату запрещён",
        "chat.not_available": "Чат доступен только после принятия заявки волонтёром",
        "chat.text_required": "Сообщение не должно быть пустым",
        "chat.push_title": "Новое сообщение",
        "chat.push_body": "{name}: {text}",
        "ai.not_configured": "ИИ не настроен на сервере",
        "ai.failed": "Ошибка ИИ-сервиса",
        "ai.disclaimer": "Это не медицинский диагноз и не замена врачу. Если есть угроза жизни — звоните в экстренные службы.",
    },
    "en": {
        "auth.unauthorized": "Unauthorized",
        "auth.forbidden": "Forbidden",
        "auth.phone_taken": "Phone already registered",
        "auth.invalid_role": "role must be user or volunteer",
        "auth.invalid_credentials": "Invalid credentials",
        "request.invalid_kind": "kind must be sos or symptom",
        "request.volunteer_only_sos": "Volunteers can only create SOS requests",
        "request.not_found": "Not found",
        "request.status_invalid": "Invalid status",
        "request.already_handled": "Request already handled by volunteer",
        "review.only_completed": "You can review only completed requests",
        "review.no_volunteer": "No volunteer assigned",
        "review.rating_range": "rating must be 1..5",
        "review.already_submitted": "Review already submitted",
        "volunteer.active_request_exists": "You already have an active request",
        "volunteer.request_not_new": "Request is not new",
        "volunteer.status_invalid": "Invalid status",
        "volunteer.request_closed": "Request already closed",
        "volunteer.must_accept_first": "Request must be accepted first",
        "volunteer.transition_from_accepted": "From accepted you can only go to in_progress or canceled",
        "volunteer.transition_from_in_progress": "From in_progress you can only go to completed or canceled",
        "validation.error": "Invalid request data",
        "chat.forbidden": "Chat access forbidden",
        "chat.not_available": "Chat is available only after a volunteer accepts the request",
        "chat.text_required": "Message text is required",
        "chat.push_title": "New message",
        "chat.push_body": "{name}: {text}",
        "ai.not_configured": "AI is not configured on the server",
        "ai.failed": "AI service error",
        "ai.disclaimer": "This is not a medical diagnosis and not a substitute for a doctor. If life-threatening, call emergency services.",
    },
    "ky": {
        "auth.unauthorized": "Авторизация жок",
        "auth.forbidden": "Тыюу салынган",
        "auth.phone_taken": "Телефон мурун катталган",
        "auth.invalid_role": "role user же volunteer болушу керек",
        "auth.invalid_credentials": "Телефон же сырсөз туура эмес",
        "request.invalid_kind": "kind sos же symptom болушу керек",
        "request.volunteer_only_sos": "Ыктыярчылар SOS кайрылууларын гана түзө алышат",
        "request.not_found": "Табылган жок",
        "request.status_invalid": "Туура эмес статус",
        "request.already_handled": "Кайрылуу ыктыярчы тарабынан иштелген",
        "review.only_completed": "Пикирди гана аяктаган кайрылууга калтырса болот",
        "review.no_volunteer": "Ыктыярчы дайындалган эмес",
        "review.rating_range": "Баалоо 1ден 5ке чейин",
        "review.already_submitted": "Пикир мурун жөнөтүлгөн",
        "volunteer.active_request_exists": "Сизде активдүү кайрылуу бар",
        "volunteer.request_not_new": "Кайрылуу жаңы эмес",
        "volunteer.status_invalid": "Туура эмес статус",
        "volunteer.request_closed": "Кайрылуу жабылган",
        "volunteer.must_accept_first": "Адегенде кайрылууну кабыл алуу керек",
        "volunteer.transition_from_accepted": "accepted статустун ичинен in_progress же canceled гана",
        "volunteer.transition_from_in_progress": "in_progress статустун ичинен completed же canceled гана",
        "validation.error": "Сурамдын маалыматы туура эмес",
        "chat.forbidden": "Чатка кирүүгө тыюу салынган",
        "chat.not_available": "Чат ыктыярчы кайрылууну кабыл алгандан кийин гана жеткиликтүү",
        "chat.text_required": "Билдирүү бош болбошу керек",
        "chat.push_title": "Жаңы билдирүү",
        "chat.push_body": "{name}: {text}",
        "ai.not_configured": "ИИ серверде жөндөлгөн эмес",
        "ai.failed": "ИИ кызматынын катасы",
        "ai.disclaimer": "Бул медициналык диагноз эмес жана дарыгердин ордун баспайт. Өмүргө коркунуч болсо — тез жардам чакырыңыз.",
    },
}


def normalize_lang(value: Optional[str]) -> str:
    if not value:
        return "ru"

    raw = value.strip().lower()


    raw = raw.split(",")[0].split(";")[0].strip()

    if raw.startswith("ru"):
        return "ru"
    if raw.startswith("en"):
        return "en"
    if raw.startswith("ky") or raw.startswith("kg"):
        return "ky"


    return raw if raw in _supported else "ru"


def set_lang(lang: str) -> contextvars.Token:
    lang = normalize_lang(lang)
    return _current_lang.set(lang)


def reset_lang(token: contextvars.Token) -> None:
    _current_lang.reset(token)


def get_lang() -> str:
    lang = _current_lang.get()
    return lang if lang in _supported else "ru"


def tr(key: str, *, vars: Optional[Dict[str, Any]] = None) -> str:
    lang = get_lang()
    s = I18N.get(lang, {}).get(key) or I18N.get("ru", {}).get(key) or key
    if vars:
        for k, v in vars.items():
            s = s.replace("{" + k + "}", str(v))
    return s


def set_request_language(request: Request) -> contextvars.Token:
    q_lang = request.query_params.get("lang")
    if q_lang:
        return set_lang(q_lang)

    h_lang = request.headers.get("accept-language")
    return set_lang(h_lang or "ru")
