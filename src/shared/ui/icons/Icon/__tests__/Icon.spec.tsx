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

    it('centers a 16x16 glyph (info) at default glyphSize=16 inside the 20-unit container', () => {
        // info bbox: {0, 0, 16, 16} → scale=1, offset=(20-16)/2=2
        const markup = renderToStaticMarkup(<Icon name="info" />);

        expect(markup).toContain('transform="translate(2 2) scale(1)"');
    });

    it('renders the path data of the requested icon glyph', () => {
        const markup = renderToStaticMarkup(<Icon name="arrow_right" />);

        expect(markup).toContain('M1.61732 16L10 8L1.61732 0');
    });

    it('scales a non-square glyph (burger 16x12) to fit glyphSize and centers it', () => {
        // burger bbox: {0, 0, 16, 12} with glyphSize=12 → scale=12/16=0.75
        // offsetX=(20-16*0.75)/2=4, offsetY=(20-12*0.75)/2=5.5
        const markup = renderToStaticMarkup(<Icon name="burger" glyphSize={12} />);

        expect(markup).toContain('transform="translate(4 5.5) scale(0.75)"');
    });
});
