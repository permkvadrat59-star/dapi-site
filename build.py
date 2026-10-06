"""Сборка сайта DAPI.

Берет src/layout.html и страницы из src/pages, кладет готовые *.html в корень.
Заодно проверяет видимый текст по правилам DAPI: без буквы ё, без длинных тире,
без двоеточий. Запуск: python build.py
"""
import hashlib
import html
import io
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
BASE = "https://permkvadrat59-star.github.io/dapi-site/"

NAV = [
    ("index", "Главная"),
    ("studio", "Студия"),
    ("cases", "Кейсы"),
    ("team", "Команда"),
    ("vmeste", "Вместе"),
    ("contacts", "Контакты"),
]


def read(path):
    return io.open(path, encoding="utf-8").read()


def icon(name):
    svg = read(SRC / "icons" / f"{name}.svg").strip()
    return svg.replace("<svg ", f'<svg class="ico ico-{name}" aria-hidden="true" ', 1)


def stamp(rel):
    """Метка версии файла, чтобы браузер не держал старые стили и скрипт."""
    return hashlib.md5((ROOT / rel).read_bytes()).hexdigest()[:8]


def front_matter(text):
    m = re.match(r"\s*<!--(.*?)-->\n?", text, flags=re.S)
    meta = {}
    if m:
        for line in m.group(1).strip().splitlines():
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
        text = text[m.end():]
    return meta, text


def nav_html(current, indent):
    out = []
    for slug, name in NAV:
        cur = ' aria-current="page"' if slug == current else ""
        out.append(f'{indent}<a href="{slug}.html"{cur}>{name}</a>')
    return "\n".join(out)


def visible_text(page):
    s = re.sub(r"<!--.*?-->", "", page, flags=re.S)
    s = re.sub(r"<(script|style|svg)\b.*?</\1>", "", s, flags=re.S)
    attrs = re.findall(r'\b(?:alt|aria-label|content)="([^"]*)"', s)
    attrs = [a for a in attrs if not a.startswith(("http", "#")) and "=" not in a and "(" not in a]
    s = re.sub(r"<title>(.*?)</title>", r" \1 ", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return html.unescape(s + " " + " ".join(attrs))


def check(name, page):
    text = visible_text(page)
    problems = []
    for bad, why in [("ё", "буква ё"), ("Ё", "буква Ё"), ("—", "длинное тире"), ("–", "среднее тире"), (":", "двоеточие")]:
        for m in re.finditer(re.escape(bad), text):
            around = " ".join(text[max(0, m.start() - 30):m.end() + 30].split())
            problems.append(f"{name}: {why} возле «{around}»")
    for m in re.finditer(r"\b[Нн]е\b[^.!?]{0,60},\s+а\s", text):
        print(f"  заметка, {name}: оборот «не X, а Y» в «{' '.join(m.group(0).split())}»")
    return problems


def main():
    layout = read(SRC / "layout.html")
    problems = []
    for path in sorted((SRC / "pages").glob("*.html")):
        slug = path.stem
        meta, body = front_matter(read(path))
        page = layout
        page = page.replace("{{content}}", body.rstrip("\n"))
        page = page.replace("{{nav}}", nav_html(slug, " " * 6))
        page = page.replace("{{footnav}}", nav_html(None, " " * 10))
        page = page.replace("{{title}}", html.escape(meta.get("title", "DAPI")))
        page = page.replace("{{description}}", html.escape(meta.get("description", ""), quote=True))
        page = page.replace("{{page}}", slug)
        page = page.replace("{{force}}", f' data-force="{meta["force"]}"' if "force" in meta else "")
        page = page.replace("{{robots}}", f'<meta name="robots" content="{meta["robots"]}">\n' if "robots" in meta else "")
        page = page.replace("{{base}}", BASE)
        page = page.replace("{{year}}", str(date.today().year))
        page = re.sub(r"\{\{icon:([a-z-]+)\}\}", lambda m: icon(m.group(1)), page)
        for rel in ("assets/css/site.css", "assets/js/site.js"):
            page = page.replace(f'"{rel}"', f'"{rel}?v={stamp(rel)}"')
        left = re.findall(r"\{\{[^}]+\}\}", page)
        if left:
            problems.append(f"{slug}: не раскрыты вставки {left}")
        problems += check(slug, page)
        io.open(ROOT / f"{slug}.html", "w", encoding="utf-8", newline="\n").write(page)
        print(f"собрано {slug}.html")
    if problems:
        print("\nНужно поправить текст:")
        for p in problems:
            print("  " + p)
        sys.exit(1)
    print("Текст чистый.")


if __name__ == "__main__":
    main()
