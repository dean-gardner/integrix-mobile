import { buildLeafletPickerHtml } from '../src/utils/gpsPinPickerHtml';

describe('buildLeafletPickerHtml', () => {
  it('includes map container and coordinates', () => {
    const html = buildLeafletPickerHtml(48.61517, 22.6469);
    expect(html).toContain('<div id="map"></div>');
    expect(html).toContain('48.61517');
    expect(html).toContain('22.6469');
    expect(html).toContain('leaflet');
  });
});
