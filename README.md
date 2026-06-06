<p align="center">
  <img src="brand/logo.svg" alt="no harm org" width="96" height="96">
</p>

<h1 align="center">dnd-player</h1>

<p align="center">
  <b>a no harm org project</b> · by <b>Kirkamah</b> ☮<br>
  <sub>© 2026 Kirkamah · no harm org — All rights reserved.</sub>
</p>

---

Веб-плеер формата **`.dndsession`** (спецификация — [FORMAT.md](FORMAT.md), производитель —
проект `dnd-recorder`). Только воспроизведение, без редактирования: рендер сцены слоями,
смена idle/speaking-артов по таймлайну речи и синхронный мультитрек-звук.

## Запуск

Десктопное приложение (Electron). Готовый exe после сборки:
`release\win-unpacked\DnD Player.exe` (его же запускает ярлык «DnD Player» на рабочем
столе) и одно-файловый портативный `release\DnD-Player-<версия>.exe`.

```bash
npm install
npm run app        # сборка + запуск десктоп-приложения
npm run dist       # пересобрать exe (release/)
npm run dev        # чисто веб-режим для разработки (http://localhost:5173)
```

Перетащи `.dndsession` в окно (или выбери файл) → play. Пробел — play/pause.

## Сцена

Слои снизу вверх: `background` → `bricks` (прозрачность по `sceneCues`) → `frame` →
портреты → overlay (зарезервировано под Проект 3). Разрешение сцены — **1920×1080**.

Лейаут портретов (константа `LAYOUT` в `scene-renderer.ts`):
- **мастер** — крупно в левом нижнем углу (340×340);
- **игроки** (слоты 0..5) — вертикальной колонкой у правого края (220×130).

Говорящий: speaking-арт + свечение рамки `#2FA37C` + подсветка имени; молчащие
приглушены. Участник без арта рисуется заглушкой с первой буквой имени персонажа.
Участники без слота автоматически занимают свободные слоты по порядку.

## Архитектура (важно для Проекта 3)

Чистые переиспользуемые модули — редактор берёт их как есть:

| Модуль | Ответственность |
|---|---|
| `bundle-loader.ts` | `.dndsession` → объект сцены (manifest, Float32-дорожки, ImageBitmap-арты). Без DOM-UI. |
| `scene-state.ts` | чистая функция `stateAt(manifest, t)` → кто говорит, прозрачность кирпичей, текущий фон |
| `scene-renderer.ts` | `SceneRenderer.render(state)` — рисует кадр на Canvas. Никакой логики воспроизведения/редактирования. |
| `audio-player.ts` | `MultiTrackPlayer` — Web Audio микс всех дорожек, один плейхед, play/pause/seek |
| `main.ts` | только UI-обвязка: drag&drop, контролы, rAF-цикл |

## Проверка

```bash
node scripts/verify.mjs [путь к .dndsession]            # веб-версия (headless-Chromium)
node scripts/verify-electron.mjs [путь к .dndsession]   # десктоп-версия (Electron)
```

Оба загружают реальный бандл, мотают на момент реплики, проверяют ход таймкода
и снимают скриншоты в `.verify/`.

## Ограничения v1

- Дорожки целиком декодируются в память (Float32): ~690 МБ RAM на участника за час
  записи. Для многочасовых сессий с 6+ игроками потребуется стриминговое чтение —
  отложено до реальной необходимости.
- Распаковка zip синхронная — на гигабайтных бандлах интерфейс замирает на время
  загрузки (после загрузки всё плавно).

---

<p align="center">
  ☮ <b>no harm org</b> · made by <b>Kirkamah</b><br>
  <sub>© 2026 Kirkamah · no harm org — All rights reserved. See <a href="LICENSE">LICENSE</a>.</sub>
</p>
