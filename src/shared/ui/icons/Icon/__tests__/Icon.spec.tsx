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

    it('scales the glyph by the default glyph size (16) and centers it inside the 20-unit container', () => {
        const markup = renderToStaticMarkup(<Icon name="info" />);

        expect(markup).toContain('transform="translate(10 10) scale(16)"');
    });

    it('renders the path data of the requested icon glyph', () => {
        const markup = renderToStaticMarkup(<Icon name="arrow_right" />);

        expect(markup).toContain('M1.61732 16L10 8L1.61732 0');
    });

    it('allows overriding the glyph box size within the 20-unit container', () => {
        const markup = renderToStaticMarkup(<Icon name="burger" glyphSize={12} />);

        expect(markup).toContain('transform="translate(10 10) scale(12)"');
    });
});
