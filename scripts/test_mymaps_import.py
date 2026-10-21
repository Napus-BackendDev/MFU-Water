"""Use synthetic rows, never commit private household fixtures."""
from pathlib import Path
import runpy
import tempfile
import unittest

normalize = runpy.run_path(str(Path(__file__).with_name('import-mymaps-review.py')))['normalize']


def fixture(coordinates='99.36,20.05,0',include_status=True):
    folders = []
    for layer in range(1,7):
        rows = []
        for row in range(129):
            status = f'<Data name="สถานะจัดสีหมุด_Layer{layer}"><value>source class</value></Data>' if include_status else ''
            rows.append(f'''<Placemark><styleUrl>#pin</styleUrl><ExtendedData>{status}
                <Data name="เลขที่บ้าน"><value>PRIVATE_IDENTIFIER</value></Data>
                <Data name="โซน"><value>test zone</value></Data></ExtendedData>
                <Point><coordinates>{coordinates}</coordinates></Point></Placemark>''')
        folders.append(f'<Folder><name>Theme {layer}</name>{"".join(rows)}</Folder>')
    return f'''<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Test source</name>
        <Style id="normal"><IconStyle><color>ff123456</color></IconStyle></Style>
        <StyleMap id="pin"><Pair><key>normal</key><styleUrl>#normal</styleUrl></Pair></StyleMap>
        {"".join(folders)}</Document></kml>'''


class ImportTests(unittest.TestCase):
    def parse(self,text):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder)/'source.kml'
            source.write_text(text,encoding='utf-8')
            return normalize(source)

    def test_preserves_all_rows_and_source_colors_without_exporting_identifiers(self):
        data = self.parse(fixture())
        self.assertEqual(len(data['layers']),6)
        self.assertEqual(data['sourceRowsPerLayer'],129)
        self.assertEqual(data['distinctCoordinates'],1)  # Duplicated rows are not dropped.
        for layer in data['layers']:
            self.assertEqual(len(layer['records']),129)
            self.assertEqual(layer['records'][0]['color'],'#563412')
            self.assertEqual(layer['legend'][0]['rows'],129)
            self.assertEqual(layer['records'][0]['fields'],{'โซน':'test zone'})
        self.assertIsNone(data['surveyDate'])

    def test_rejects_unknown_coordinate_and_missing_status(self):
        for source in [fixture('nan,20.05,0'),fixture('0,0,0'),fixture(include_status=False)]:
            with self.assertRaises(AssertionError):
                self.parse(source)

    def test_rejects_changed_layer_structure(self):
        with self.assertRaisesRegex(AssertionError,'structure changed'):
            self.parse(fixture().replace('</Document>','<Folder><name>unexpected</name></Folder></Document>'))


if __name__=='__main__':
    unittest.main()
