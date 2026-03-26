import VkEntryPage from './VkEntryPage';

// searchParams читаются на сервере — до того как мобильный VK WebView
// успевает вычистить query string через history.replaceState на клиенте.
export default async function VkPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string>>;
}) {
    const params = await searchParams;
    const initialQueryString = new URLSearchParams(params).toString();

    return <VkEntryPage initialQueryString={initialQueryString} />;
}
