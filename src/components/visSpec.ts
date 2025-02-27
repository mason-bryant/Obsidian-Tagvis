
interface VisSpec {
    type: string;
    layout: {
        width: number;
        height: number;
        margin: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
        columnWidths: any[];
    };
    data: any[];
    scales: any;
    axes: any;
    marks: any[];
}

export function newVisSpec(): VisSpec {
     let spec = {
        "type": "barChart",
        "layout": {
          "width": 800,
          "height": 600,
          "margin": { "top": 20, "right": 20, "bottom": 40, "left": 40 }
          "topMargin": true
        },
        //columnWidths: []

        "data": [
          { "label": "A", "value": 28 },
          { "label": "B", "value": 55 },
          { "label": "C", "value": 43 },
          { "label": "D", "value": 91 },
          { "label": "E", "value": 81 },
          { "label": "F", "value": 53 },
          { "label": "G", "value": 19 },
          { "label": "H", "value": 87 }
        ],
        "scales": {
          "x": { "type": "band", "domain": "data.category", "range": [0, 800] },
          "y": { "type": "linear", "domain": [0, 100], "range": [600, 0] }
        },
        "axes": {
          "x": { "orient": "bottom", "ticks": 10 },
          "y": { "orient": "left", "ticks": 5 }
        },
        "marks": [
          {
            "type": "rect",
            "tooltip": {
              "fields": ["category", "value"],
              "format": { "value": ".0f" }
            },
            "encode": {
              "enter": {
                "x": { "scale": "x", "field": "category" },
                "y": { "scale": "y", "field": "value" },
                "width": { "scale": "x", "band": 1 },
                "height": { "scale": "y", "field": "value", "offset": -600 },
                "fill": { "value": "steelblue" }
              }
            }
          }
        ]
      }

      return spec;


}