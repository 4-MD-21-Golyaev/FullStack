self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    // Добавляем заголовок только для ngrok-тоннелей
    if (!url.hostname.endsWith('.ngrok-free.app') && !url.hostname.endsWith('.ngrok-free.dev')) return;

    const headers = new Headers(event.request.headers);
    headers.set('ngrok-skip-browser-warning', '1');

    const req = new Request(event.request, { headers });
    event.respondWith(fetch(req));
});
