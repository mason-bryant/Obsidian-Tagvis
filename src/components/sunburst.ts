import {
    App,
} from "obsidian";

import * as d3 from "d3";
import { Plugin } from "obsidian";
import { StarburstConfig, parseConfig } from "./config";
import { getQuery } from './tagQuery';
import { ObsidianD3jsSettings } from "./settings";
import { DataNode, updateChildren } from "./dataNode";

let m_config: StarburstConfig;
let m_firstRun = true;
let m_rootData: DataNode;
let m_ignoreFilesWithTagsCached = "";

let m_tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
let m_settings: ObsidianD3jsSettings;
let m_app: App;


interface ArcDatum extends d3.HierarchyRectangularNode<DataNode> {
    data: DataNode;
}


export function init(app: App,
    el: HTMLElement,
    settings: ObsidianD3jsSettings,
    config: StarburstConfig) {

    m_firstRun = true;
    m_config = config;
    m_app = app;
    m_settings = settings;

    m_rootData = new DataNode();

    if (m_config.ignoreFilesWithTags.length > 0) {
        m_ignoreFilesWithTagsCached = m_config.ignoreFilesWithTags.map(tag =>
            `contains(file.tags, "${tag}") = false AND contains(file.etags, "${tag}") = false`)
            .join(" AND ");
        m_ignoreFilesWithTagsCached = " AND " + m_ignoreFilesWithTagsCached;
    }
    uniqueTags = [];

    if (!el) {
        console.error("Invalid DOM element");
        return;
    }

    if ((m_config.layout.width > el.clientWidth) && (el.clientWidth > 0)) {
        m_config.layout.width = el.clientWidth;
        console.log("Configured width is too large. Width adjusted to", m_config.layout.width);
    }

    d3.select(el).selectAll("*").remove();

    const svg = d3.select(el)
        .append("svg")
        .attr("id", "tagvis-root-svg")
        .attr("width", m_config.layout.width)
        .attr("height", m_config.layout.height)
        .attr("viewBox", `0 0 ${m_config.layout.width} ${m_config.layout.height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("background", "white");
    
    const g = svg.append("g")
        .attr("id", "tagvis-root-g")
        .attr("transform", `translate(${m_config.layout.width / 2}, ${m_config.layout.height / 2})`)
        .attr("fill-opacity", 0.6);


    render(el);
}

let uniqueTags: string[];
let el;

export function render(_el) {
    el = _el;

    const format = d3.format(",d");

    d3.selectAll("[id='obsidian-d3-tooltip']").remove();
    m_tooltip = d3.select("body").append("div")
        .attr("id", "obsidian-d3-tooltip")
        .attr("class", "tagvis-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "auto")

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, m_rootData.children.length + 1));
    const radius = Math.min(m_config.layout.width, m_config.layout.height) / 2 - 20;

    const partition = data => d3.partition()
        .size([2 * Math.PI, radius])
        (d3.hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => (b as any).value - (a as any).value)) as ArcDatum;

    const arc = d3.arc<ArcDatum>()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius / 2)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1 - 1);

    const root = partition(m_rootData);

    const svg = d3.select("#tagvis-root-svg");
    const g = d3.select("#tagvis-root-g");        

    const paths = g.selectAll<SVGPathElement, ArcDatum>("path")
        .data(root.descendants().filter(d => d.depth) as ArcDatum[])
        .join("path")
        .attr("fill", d => { while (d.depth > 1) (d as any) = d.parent; return color(d.data.name); })
        .attr("d", arc)
        .attr("pointer-events", "auto")
        .on("click", function (event: MouseEvent, d: ArcDatum) {
            onNodeClick(m_rootData, d.data.name);
        })
        .on("mouseover", function (event: MouseEvent, d: ArcDatum) {
            mouseoverVisNode(event, d.data);
        })
        .on("mouseout", function (event: MouseEvent, d: ArcDatum) {
            mouseleftVisNode(event, d.data);
        })
        .append("title")
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value ?? 0)}`);

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
        .on("click", function (event, d: ArcDatum) {
            onNodeClick(m_rootData, d.data.name);
        })
        .on("mouseover", function (event, d: ArcDatum) {
            mouseoverVisNode(event, d.data);
        })
        .on("mouseout", function (event, d: ArcDatum) {
            mouseleftVisNode(event, d.data);
        })
        .text(d => d.data.getTruncatedName(m_config.maxTagLength));

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

    if (m_firstRun) {
        m_firstRun = false;
        startQuery();
    }

    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function onNodeClick(data: DataNode, name: string) {
        console.log("nodeClick with tag " + name);
        startQuery(name)
    }

    

    async function populateTooltip(tooltip, data) {
        let tag = data.name;
        let requiredTags = tag ? [...data.tagHistory, tag] : [...data.tagHistory];

        let requiredTagsString = requiredTags.map(tag =>
            `${tag}`).join(", ");

        let fileQuery = getQuery(requiredTags,
            m_config.ignoreFilesWithTags,
            [], m_config.maxChildren, false);

        try {
            const dv = (m_app as any).plugins.plugins["dataview"]?.api;
            if (!dv) {
                console.error("Dataview plugin is not enabled.");
                return;
            }

            const result = await dv.query(fileQuery);

            if (!result.successful) {
                console.log("query failed", fileQuery);
                return;
            }
            tooltip.selectAll("*").remove();



            let documentString = "document";
            if (data.value != 1) {
                documentString = "documents";
            }
            tooltip.append("span")
                .attr("class", "tagvis-tooltip-header")
                //.text(`Found ${data.value} ${documentString} containing: ${tags}`);             
                .text(`${requiredTagsString}`);
            tooltip.append("br")

            result.value.values.forEach(item => {
                let link = tooltip.append("a")
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
        showTooltip(event, data);

    }

    function mouseleftVisNode(event: MouseEvent, data: DataNode) {
    }

    function showTooltip(event: MouseEvent, data: DataNode) {
        populateTooltip(m_tooltip, data);

        m_tooltip.style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("display", "block")

        m_tooltip.on("mouseleave", function () {
            hideTooltip();
        })
    }

    function hideTooltip() {
        m_tooltip.style("display", "none")
    }
}

export function hookMarkdownLinkMouseEventHandlers(
    app: App,
    url: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>,
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

    if (!m_settings.displayLinkPreview) {
        return;
    }

    url.on("mouseover", function (event: MouseEvent) {
        event.preventDefault();
        if (linkText) {
            app.workspace.trigger("hover-link", {
                event,
                source: "preview",
                hoverParent: { hoverPopover: null },
                targetEl: event.currentTarget as HTMLElement,
                linktext: linkText,
                sourcePath: filePath,
            });
        }
    });
}

function isNodeUnique(child: DataNode) {
    let tagsInChild = child.tagHistory ?
        [...child.tagHistory, child.name] : [...child.name];
    tagsInChild.sort();
    let tagsInChildSet = new Set(tagsInChild);
    let tagsInChilString = [...tagsInChildSet].map(tag =>
        `${tag}`).join(", ");

    if (uniqueTags.contains(tagsInChilString)) {
        return false;
    } else {
        uniqueTags.push(tagsInChilString);
        return true;
    }
}

export function startQuery(initialTag?: string) {
    if(! initialTag) {
        initialTag = m_config.initialTag
    }
    uniqueTags = [];
    
    if (initialTag === null || initialTag === "") {
        executeTagNodeQuery(m_rootData, 0)
    } else {
        m_rootData.name = initialTag;
        executeTagNodeQuery(m_rootData, 1)
    }
}

async function executeTagNodeQuery(
    data: DataNode,
    initialDepth: number) {

    let newTagHistory = data.tagHistory.slice();
    newTagHistory.push(data.name);

    let depth = newTagHistory.length + 1 - initialDepth;

    if (depth > m_config.maxDepth) {
        console.log("at depth")
        return;
    }
    
    //d3.select(el).selectAll("*").remove();
    //render(el);
    await sleep(1);

    await runQuery(data.name, newTagHistory).then(result => {
        if (!result.successful) {
            console.log("query failed");
            return;
        }

        let queryResults: DataNode[] = [];

        result.value.values.forEach(item => {
            let tag = item[0];

            let child = new DataNode();
            child.name = tag;
            child.tagHistory = newTagHistory;
            child.value = item[1];
            child.children = [];

            if (isNodeUnique(child)) {
                queryResults.push(child);
            }
        });

        function updateFn(src: DataNode, dest: DataNode) {
            dest.children = src.children;
            dest.tagHistory = src.tagHistory;
    
            if(! dest.tagHistory) {
                dest.tagHistory = [];
            }

            if (depth < m_config.maxDepth) {
                executeTagNodeQuery(dest, initialDepth);
            }
        }

        function newNodeFn(src: DataNode) {
            if(! src.tagHistory) {
                src.tagHistory = [];
            }

           if (depth < m_config.maxDepth) {
                executeTagNodeQuery(src, initialDepth);
            }
        }

        updateChildren(data.children, queryResults, newNodeFn, updateFn);

        //d3.select(el).selectAll("*").remove();
        render(el);
    });
}

async function runQuery(tag, tagHistory) {
    let requiredTags = tag ? [...tagHistory, tag] : [...tagHistory];

    const tagsToExclude = [...tagHistory, ...m_config.filterTags];

    let query = getQuery(requiredTags,
        m_config.ignoreFilesWithTags,
        tagsToExclude, m_config.maxChildren);


    //TODO: Don't like the cast to any here
    const dv = (m_app as any).plugins.plugins["dataview"]?.api;
    if (!dv) {
        console.error("Dataview plugin is not enabled.");
        return;
    }

    try {
        const result = await dv.query(query);
        return result;
    } catch (error) {
        console.error("Dataview Query Error:", error);
    }
}
