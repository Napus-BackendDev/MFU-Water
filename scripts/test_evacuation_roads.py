"""Regression checks for road geometry, gaps, restricted roads and missing links."""
import unittest
from align_evacuation_roads import align_routes, connect_route_gaps


def road(ids,coordinates,**tags):
    return {'type':'way','nodes':ids,'geometry':[{'lat':lat,'lon':lon} for lat,lon in coordinates],
            'tags':{'highway':'residential',**tags}}


class AlignmentTests(unittest.TestCase):
    def test_connects_small_source_gap_via_road_bend_not_a_diagonal(self):
        a,b,c = [20.,99.],[20.,99.0004],[20.0004,99.0004]
        roads = {'elements':[road([1,2,3],[a,b,c])]}
        source = [[a,[20.,99.0002]],[[20.0002,99.0004],c]]
        result,_,connectors = connect_route_gaps(source,roads)
        self.assertEqual(len(result),1)
        self.assertIn(b,result[0])
        self.assertGreater(connectors[0]['roadLengthMetres'],connectors[0]['gapMetres'])
        self.assertEqual(result[0][0],a)
        self.assertEqual(result[0][-1],c)

    def test_never_joins_disconnected_or_distant_routes(self):
        roads = {'elements':[road([1,2],[[20.,99.],[20.,99.0002]]),road([3,4],[[20.0002,99.0002],[20.0004,99.0002]])]}
        with self.assertRaisesRegex(AssertionError,'No connected OSM path'):
            connect_route_gaps([[[20.,99.],[20.,99.0002]],[[20.0002,99.0002],[20.0004,99.0002]]],roads)
        roads = {'elements':[road([1,2,3,4],[[20.,99.],[20.,99.001],[20.,99.003],[20.,99.004]])]}
        with self.assertRaisesRegex(AssertionError,'gap is over 80'):
            connect_route_gaps([[[20.,99.],[20.,99.001]],[[20.,99.003],[20.,99.004]]],roads)

    def test_follows_road_bends_and_keeps_source_segments_separate(self):
        a,b,c,d = [20.,99.],[20.,99.001],[20.001,99.001],[20.002,99.001]
        data = {'elements':[road([1,2,3,4],[a,b,c,d])]}
        source = [[[20.00001,99.0001],[20.0009,99.00101]],[[20.0015,99.00101],d]]
        result,audit = align_routes(source,data)
        self.assertEqual(len(result),2)
        self.assertIn(b,result[0])  # No diagonal shortcut across the bend.
        self.assertNotEqual(result[0][-1],result[1][0])  # Preserve the PDF gap.
        self.assertLess(audit[0]['maxAnchorOffsetMetres'],2)
        self.assertEqual(source[0][0],[20.00001,99.0001])

    def test_does_not_jump_between_disconnected_roads(self):
        data = {'elements':[road([1,2],[[20.,99.],[20.,99.001]]),road([3,4],[[20.001,99.001],[20.002,99.001]])]}
        with self.assertRaisesRegex(AssertionError,'No connected OSM path'):
            align_routes([[[20.,99.],[20.002,99.001]]],data)

    def test_rejects_private_road_and_distant_anchor(self):
        private = {'elements':[road([1,2],[[20.,99.],[20.,99.001]],access='private')]}
        with self.assertRaisesRegex(AssertionError,'No usable'):
            align_routes([[[20.,99.],[20.,99.001]]],private)
        public = {'elements':[road([1,2],[[20.,99.],[20.,99.001]])]}
        with self.assertRaisesRegex(AssertionError,'over 80 m'):
            align_routes([[[20.01,99.],[20.,99.001]]],public)


if __name__=='__main__':
    unittest.main()
