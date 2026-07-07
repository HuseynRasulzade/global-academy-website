"""
Backend for the Global Academy AI chat widget.

Proxies chat messages to OpenAI. The API key stays server-side only (loaded
from server/.env for local dev, or from a real environment variable when
deployed on a host like Render) and is never sent to the browser.

Local dev:  python3 server/app.py   ->  http://localhost:5050
Also serves the static site itself when run locally, purely for convenience.

Deployed (e.g. Render): the platform sets PORT; the frontend (hosted
separately, e.g. on Netlify) calls this service's /api/chat over CORS.
Set ALLOWED_ORIGIN to your live site's URL (e.g. https://globalacademy.netlify.app)
to restrict which origins may call the API; defaults to "*" (any origin).
"""
import json
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SITE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OPENAI_MODEL = "gpt-4o-mini"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"

SYSTEM_PROMPT = (
    "Sən Global Academy təhsil mərkəzinin sayt üzərindəki AI köməkçisisən. "
    "Global Academy HR, Maliyyə (Finance), İngilis dili və Süni İntellekt (AI) "
    "istiqamətlərində təlimlər, eləcə də xaricdə təhsil üzrə konsultasiya xidmətləri göstərir.\n\n"
    "Təlim proqramları: ACCA (beynəlxalq maliyyə və mühasibatlıq sertifikatı), "
    "SHRM (İnsan Resurslarının İdarə Edilməsi sertifikatı), "
    "CIPS (Satınalma və Təchizat Zəncirinin İdarə Edilməsi), "
    "Praktiki Maliyyə Uçotu, IELTS (Akademik/General), General English, "
    "Süni İntellekt (AI) - prompt engineering və AI alətləri.\n\n"
    "Xaricdə təhsil xidmətləri: universitet seçimi, ixtisas müəyyənləşdirilməsi, "
    "sənədlərin hazırlanması, müraciət prosesi, təqaüd imkanları, qəbul mərhələləri, viza dəstəyi.\n\n"
    "Ünvan: Qarabağ Atları Meydanı, Ağ Şəhər, Bakı. Email: myglobalacademy01@gmail.com. "
    "Telefon: +994 10 426 06 17. Instagram: myglobalacademy_.\n\n"
    "İstifadəçi hansı dildə yazırsa (Azərbaycan, ingilis, rus), o dildə cavab ver. "
    "Qısa, mehriban və köməkçi ol. Konkret qiymət, tarix və ya zəmanət tələb olunan suallarda "
    "dəqiq rəqəm uydurma - əvəzində əlaqə formunu doldurmağı və ya myglobalacademy01@gmail.com "
    "ilə əlaqə saxlamağı təklif et."
)


def load_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())


load_env()
API_KEY = os.environ.get("OPENAI_API_KEY", "")
ALLOWED_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*")
PORT = int(os.environ.get("PORT", 5050))

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json",
}


class Handler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/health":
            self._send_json(200, {"ok": True, "hasKey": bool(API_KEY)})
            return

        # Never expose the server/ folder (contains .env with the API key)
        if self.path.startswith("/server/") or self.path == "/server":
            self.send_error(404, "Not found")
            return

        path = self.path.split("?", 1)[0]
        if path == "/":
            path = "/index.html"

        file_path = os.path.normpath(os.path.join(SITE_ROOT, path.lstrip("/")))
        if not file_path.startswith(SITE_ROOT) or not os.path.isfile(file_path):
            self.send_error(404, "Not found")
            return

        ext = os.path.splitext(file_path)[1]
        content_type = MIME_TYPES.get(ext, "application/octet-stream")
        with open(file_path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_error(404, "Not found")
            return

        if not API_KEY:
            self._send_json(500, {"error": "OPENAI_API_KEY tapılmadı. Backend mühitində dəyişəni yoxlayın."})
            return

        length = int(self.headers.get("Content-Length", 0))
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Yanlış sorğu formatı."})
            return

        history = data.get("messages", [])
        if not isinstance(history, list) or not history:
            self._send_json(400, {"error": "Mesaj boşdur."})
            return

        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history[-20:]

        req_body = json.dumps({
            "model": OPENAI_MODEL,
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 400,
        }).encode("utf-8")

        req = urllib.request.Request(
            OPENAI_URL,
            data=req_body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
            reply = result["choices"][0]["message"]["content"].strip()
            self._send_json(200, {"reply": reply})
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="ignore")
            self._send_json(502, {"error": f"OpenAI xətası ({e.code}): {detail[:300]}"})
        except Exception as e:
            self._send_json(502, {"error": f"Serverdə xəta baş verdi: {e}"})

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Global Academy backend running on port {PORT}")
    if not API_KEY:
        print("WARNING: OPENAI_API_KEY not set - chat widget will return an error until it is configured.")
    server.serve_forever()
