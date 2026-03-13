"""
HTTP-клиент с retry, rate limiting и ротацией User-Agent.
"""
import time
import random
import requests
from config.settings import (
    USER_AGENT, MAX_RETRIES, REQUEST_DELAY_MIN, REQUEST_DELAY_MAX
)

_USER_AGENTS = [
    USER_AGENT,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

_session = None


def get_session() -> requests.Session:
    """Reusable session."""
    global _session
    if _session is None:
        _session = requests.Session()
        _session.headers.update({
            "User-Agent": USER_AGENT,
            "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
        })
    return _session


def fetch(url: str, params: dict = None, method: str = "GET",
          timeout: int = 60, rotate_ua: bool = False,
          delay: bool = True, **kwargs) -> requests.Response:
    """
    HTTP запрос с retry и rate limiting.
    """
    session = get_session()
    if rotate_ua:
        session.headers["User-Agent"] = random.choice(_USER_AGENTS)

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if delay and attempt > 1:
                wait = min(REQUEST_DELAY_MIN * (2 ** (attempt - 1)), 60)
                time.sleep(wait)

            resp = session.request(method, url, params=params,
                                   timeout=timeout, **kwargs)
            resp.raise_for_status()

            if delay:
                time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))

            return resp

        except requests.exceptions.HTTPError as e:
            last_error = e
            if e.response is not None and e.response.status_code == 429:
                wait = int(e.response.headers.get("Retry-After", 30))
                print(f"  [HTTP] 429 Too Many Requests, ждём {wait}с...")
                time.sleep(wait)
                continue
            if e.response is not None and e.response.status_code >= 500:
                continue
            raise

        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            last_error = e
            continue

    raise last_error
