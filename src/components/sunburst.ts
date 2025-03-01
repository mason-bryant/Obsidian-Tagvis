import * as d3 from "d3";
import { Plugin } from "obsidian";
import { parseConfig, StarburstConfig } from "./config";
import { getQuery } from './tagQuery';


var emptyData = {
    "name": "",
    "children": [
        {
            "name": "#",
            "value": 1,
            "children": [
            ]
        }
    ]
};

interface DataNode {
    name: string;
    value?: number;
    children: DataNode[];
}

var m_config: StarburstConfig;
var firstRun = true;
var data: DataNode;
var ignoreFilesWithTags = "";

var tooltip: HTMLElement;
export function init(el: HTMLElement, config) {
    firstRun = true;
    m_config = config;
    data = structuredClone(emptyData);

    if (m_config.ignoreFilesWithTags.length > 0) {
        ignoreFilesWithTags = m_config.ignoreFilesWithTags.map(tag =>
            `contains(file.tags, "${tag}") = false AND contains(file.etags, "${tag}") = false`)
            .join(" AND ");
        console.log("filteredTags", ignoreFilesWithTags);
        ignoreFilesWithTags = " AND " + ignoreFilesWithTags;
    }


    d3.select(el).selectAll("*").remove();
    render(el);
}


export function render(el) {
    console.log("render called");

    if (!el) {
        console.error("Invalid DOM element");
        return;
    }

    if ((m_config.layout.width > el.clientWidth) && (el.clientWidth > 0)) {
        m_config.layout.width = el.clientWidth;
        console.log("width adjusted to", m_config.layout.width);
    }
    console.log("Here");

    d3.selectAll("[id='obsidian-d3-tooltip']").remove();
    tooltip = d3.select("body").append("div")
        .attr("id", "obsidian-d3-tooltip")
        .attr("class", "tagvis-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "auto")

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));
    const radius = Math.min(m_config.layout.width, m_config.layout.height) / 2 - 20;

    const partition = data => d3.partition()
        .size([2 * Math.PI, radius])
        (d3.hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value));

    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius / 2)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1 - 1);

    const root = partition(data);

    const svg = d3.select(el)
        .append("svg")
        .attr("id", "findme")
        .attr("width", m_config.layout.width)
        .attr("height", m_config.layout.height)
        .attr("viewBox", `0 0 ${m_config.layout.width} ${m_config.layout.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("background", "white");

    const format = d3.format(",d");
    const g = svg.append("g")
        .attr("transform", `translate(${m_config.layout.width / 2}, ${m_config.layout.height / 2})`)
        .attr("fill-opacity", 0.6);

    interface ArcDatum extends d3.HierarchyRectangularNode<DataNode> {
        data: DataNode;
    }

    const paths = g.selectAll<SVGPathElement, ArcDatum>("path")
        .data(root.descendants().filter(d => d.depth) as ArcDatum[])
        .join("path")
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
        .attr("d", arc)
        .attr("pointer-events", "auto")
        .on("click", function (event: MouseEvent, d: ArcDatum) {
            onNodeClick(data, d.data.name); 
        })
        .on("mouseover", function (event: MouseEvent, d: ArcDatum) {
            mouseoverVisNode(event, d.data);   
        })
        .on("mouseout", function (event: MouseEvent, d: ArcDatum) {
            mouseleftVisNode(event, d.data);  
        })
        .append("title")
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);

    g.selectAll("text")
        .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
        .join("text")
        .attr("transform", function (d) {
            const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
            const y = (d.y0 + d.y1) / 2;
            return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        })
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", m_config.fontsize)
        .attr("font-family", "sans-serif")
        .on("click", function (event, d) {
            console.log("Clicked text:", d.data.name);
            onNodeClick(data, d.data.name); 
        })
        .on("mouseover", function (event, d) {
            mouseoverVisNode(event, d.data);            
        })
        .on("mouseout", function (event, d) {
            mouseleftVisNode(event, d.data);  
        })
        .text(d => d.data.name);


    g.append("circle")
        .attr("r", radius / 5)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 1);

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", m_config.fontsize)
        .attr("font-family", "sans-serif")
        .text(root.data.name);

    if (firstRun) {
        firstRun = false;
        start(m_config.initialTag);
        console.log("First run, done");
    }

    console.log("end....");

    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function onNodeClick(data: DataNode, name: string) {
        console.log("nodeClick with tag " + name);
        start(name)
    }

    function start(initialTag: string) {

        if (initialTag === null || initialTag === "") {
            executeQuery("", data, [], 0)
        } else {
            data.name = initialTag;
            executeQuery(initialTag, data, ["" + initialTag], 1)
        }
    }

    async function executeQuery(
        tag: string,
        data: DataNode,
        tagHistory: string[],
        initialDepth: number) {

        var depth = tagHistory.length + 1 - initialDepth;

        if (depth > m_config.maxDepth) {
            console.log("at depth")
            return;
        }
        d3.select(el).selectAll("*").remove(); 
        render(el);
        await sleep(10);

        await runQuery(tag, tagHistory).then(result => {
            if (!result.successful) {
                console.log("query failed");
                return;
            }

            data.children = [];
            result.value.values.forEach(item => {
                var tag = item[0];
                var child = {
                    name: tag,
                    tagHistory: tagHistory,
                    value: item[1],
                    children: []
                };
                data.children.push(child);

                var newTagHistory = tagHistory.slice();
                newTagHistory.push(tag);
                if (depth < m_config.maxDepth) {
                    executeQuery(tag, child, newTagHistory, initialDepth);
                }

            });
            d3.select(el).selectAll("*").remove(); 
            render(el); 
        });
    }

    async function runQuery(tag, tagHistory) {
        console.log("query for tag", tag);
        var requiredTags = tag ? [...tagHistory, tag] : [...tagHistory];

        const tagsToExclude = [...tagHistory, ...m_config.filterTags];

        var query = getQuery(requiredTags,
            m_config.ignoreFilesWithTags,
            tagsToExclude, m_config.maxChildren);

        const dv = app.plugins.plugins["dataview"]?.api;
        if (!dv) {
            console.error("Dataview plugin is not enabled.");
            return;
        }

        try {
            const result = await dv.query(query);  
            console.log("Dataview Query Result:", result);
            return result; 
        } catch (error) {
            console.error("Dataview Query Error:", error);
        }
    }

    async function populateTooltip(tooltip, data) {
        var tag = data.name;
        var requiredTags = tag ? [...data.tagHistory, tag] : [...data.tagHistory];
        var fileQuery = getQuery(requiredTags,
            m_config.ignoreFilesWithTags,
            [], m_config.maxChildren, false);

        console.log("count", data.value);
        console.log("fileQuery", fileQuery);

  
        try {
            const dv = app.plugins.plugins["dataview"]?.api;
            if (!dv) {
                console.error("Dataview plugin is not enabled.");
                return;
            }

            const result = await dv.query(fileQuery); 
            console.log("Dataview Query Result:", result);

            tooltip.selectAll("*").remove();

            tooltip.append("br")
                .attr("class", "tagvis-tooltip-header")
                .text(`Tag: ${data.name}`);             

            result.value.values.forEach(item => {
                var link = tooltip.append("a")
                    .attr("target", "_blank")
                    .attr("href", `obsidian://open?file=${item[0].path}`);
                link.text(item[1]);

                hookMarkdownLinkMouseEventHandlers(app, link, item[0].path, item[1]);
            });
           return result;  
        } catch (error) {
            console.error("Dataview Query Error:", error);
        }
        
    }
    
    function mouseoverVisNode(event: MouseEvent, data: DataNode) {
        console.log("mouseoverVisNode", data.name);
        showTooltip(event, data);
        
    }

    function mouseleftVisNode(event: MouseEvent, data: DataNode) {
        console.log("mouseleftVisNode", data.name);
    }

    function showTooltip(event: MouseEvent, data: DataNode) {
        populateTooltip(tooltip, data);

        tooltip.style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("display", "block")

        tooltip.on("mouseleave", function () {
                console.log("mouseleave 2");
                hideTooltip();
        })
    }

    function hideTooltip() {
        tooltip.style("display", "none")
    }
}

export function hookMarkdownLinkMouseEventHandlers(
	app: App,
	url: HTMLElement,
	filePath: string,
    linkText: string
) {
    url.on("click", function (event: MouseEvent) {
        event.preventDefault();
			if (linkText) {
				app.workspace.openLinkText(
					linkText,
					"",
                    true
				);
			}
		});

	url.on("mouseover", function (event: MouseEvent) {
			event.preventDefault();
			if (linkText) {
				app.workspace.trigger("hover-link", {
					event,
					source: "preview",
					hoverParent: { hoverPopover: null},
					targetEl: event.currentTarget,
					linktext: linkText,
					sourcePath: filePath,
				});
			}
		});
}

