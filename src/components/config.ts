interface StarburstConfig {
    initialTag: string;
    maxChildren: number;
    maxDepth: number;
    fontsize: number;
    fontFamily: string;
    layout: {
        width: number;
        height: number;
        margin: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
    };
    jsonError?: string; // Optional field for JSON parsing errors
}

const defaultValues  = {
    "initialTag": "",
    "maxChildren": 15,
    "maxDepth": 2,
    "fontsize": 12,
    "fontFamily": "sans-serif",
    "layout": {
        "width": 800,
        "height": 600,
        "margin": {
            "top": 20,
            "right": 20,
            "bottom": 40,
            "left": 40
        }
    },
}

export function parseConfig(jsonString: string): StarburstConfig {
    try {
        const parsedConfig = JSON.parse(jsonString);
        return {
            initialTag: parsedConfig.initialTag || defaultValues.initialTag,
            maxChildren: parsedConfig.maxChildren || defaultValues.maxChildren,
            maxDepth: parsedConfig.maxDepth || defaultValues.maxDepth,
            fontsize: parsedConfig.fontsize || defaultValues.fontsize,
            fontFamily: parsedConfig.fontFamily || defaultValues.fontFamily,
            layout: {
                width: parsedConfig.layout?.width || defaultValues.layout.width,
                height: parsedConfig.layout?.height || defaultValues.layout.height,
                margin: {
                    top: parsedConfig.layout?.margin?.top || defaultValues.layout.margin.top,
                    right: parsedConfig.layout?.margin?.right || defaultValues.layout.margin.right,
                    bottom: parsedConfig.layout?.margin?.bottom || defaultValues.layout.margin.bottom,
                    left: parsedConfig.layout?.margin?.left || defaultValues.layout.margin.left,
                }
            }
        };
    } catch (error) {
        return {
            ...defaultValues,
            jsonError: error.message
        };
    }
}