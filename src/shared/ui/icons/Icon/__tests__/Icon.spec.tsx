import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Icon } from '../Icon';

describe('Icon', () => {
    it('uses size as the outer container and keeps a fixed 20x20 viewBox', () => {
        const markup = renderToStaticMarkup(<Icon name="info" size={32} />);

        expect(markup).toContain('width="32"');
        expect(markup).toContain('height="32"');
        expect(markup).toContain('viewBox="0 0 20 20"');
    });

    it('centers the glyph inside the default 16x16 box', () => {
        const markup = renderToStaticMarkup(<Icon name="info" />);

        expect(markup).toContain('<svg x="2" y="2" width="16" height="16"');
        expect(markup).toContain('preserveAspectRatio="xMidYMid meet"');
    });

    it('preserves non-square icon aspect ratio inside the glyph box', () => {
        const markup = renderToStaticMarkup(<Icon name="arrow_right" />);

        expect(markup).toContain('viewBox="0 0 10 16"');
        expect(markup).toContain('<svg x="2" y="2" width="16" height="16"');
        expect(markup).toContain('preserveAspectRatio="xMidYMid meet"');
    });

    it('allows overriding the glyph box size within the 20-unit container', () => {
        const markup = renderToStaticMarkup(<Icon name="burger" glyphSize={12} />);

        expect(markup).toContain('<svg x="4" y="4" width="12" height="12"');
    });
});
