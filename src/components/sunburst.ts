import {
    App,
} from "obsidian";

import * as d3 from "d3";
import { Plugin } from "obsidian";
import { StarburstConfig, parseConfig } from "./config";
import { getQuery } from './tagQuery';
import { ObsidianD3jsSettings } from "./settings";


var m_maxNodeLength = 10;

class DataNode {
    m_name: string;
    value?: number;
    children: DataNode[];
    tagHistory?: string[];

    constructor() {
        this.m_name = "#";
        this.children = [];
    }

    get name() {
        return this.m_name;
    }

    set name(name: string) {
        this.m_name = name;
    }

    get truncatedName() {
        return this.m_name.length > m_config.maxTagLength
            ? this.m_name.substring(0, m_maxNodeLength) + "..." : this.m_name;
    }
}

interface ArcDatum extends d3.HierarchyRectangularNode<DataNode> {
    data: DataNode;
}

var m_config: StarburstConfig;
var firstRun = true;
var data: DataNode;
var ignoreFilesWithTags = "";

var tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
var m_settings: ObsidianD3jsSettings;
var m_app: App;

export function init(app: App,
    el: HTMLElement,
    settings: ObsidianD3jsSettings,
    config: StarburstConfig) {

    firstRun = true;
    m_config = config;
    m_app = app;
    m_settings = settings;

    data = new DataNode();

    if (m_config.ignoreFilesWithTags.length > 0) {
        ignoreFilesWithTags = m_config.ignoreFilesWithTags.map(tag =>
            `contains(file.tags, "${tag}") = false AND contains(file.etags, "${tag}") = false`)
            .join(" AND ");
        ignoreFilesWithTags = " AND " + ignoreFilesWithTags;
    }
    uniqueTags = [];

    d3.select(el).selectAll("*").remove();
    render(el);
}

var uniqueTags: string[];

export function render(el) {

    if (!el) {
        console.error("Invalid DOM element");
        return;
    }

    if ((m_config.layout.width > el.clientWidth) && (el.clientWidth > 0)) {
        m_config.layout.width = el.clientWidth;
        console.log("Configured width is too large. Width adjusted to", m_config.layout.width);
    }

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
            .sort((a, b) => (b as any).value - (a as any).value)) as ArcDatum;

    const arc = d3.arc<ArcDatum>()
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

    const paths = g.selectAll<SVGPathElement, ArcDatum>("path")
        .data(root.descendants().filter(d => d.depth) as ArcDatum[])
        .join("path")
        .attr("fill", d => { while (d.depth > 1) (d as any) = d.parent; return color(d.data.name); })
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
            onNodeClick(data, d.data.name);
        })
        .on("mouseover", function (event, d: ArcDatum) {
            mouseoverVisNode(event, d.data);
        })
        .on("mouseout", function (event, d: ArcDatum) {
            mouseleftVisNode(event, d.data);
        })
        .text(d => d.data.truncatedName);

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
    }


    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function onNodeClick(data: DataNode, name: string) {
        console.log("nodeClick with tag " + name);
        start(name)
    }

    function start(initialTag: string) {
        uniqueTags = [];
        
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

                var child = new DataNode();
                child.name = tag;
                child.tagHistory = tagHistory;
                child.value = item[1];
                child.children = [];

                if (isNodeUnique(child)) {
                    data.children.push(child);
                }


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
        var requiredTags = tag ? [...tagHistory, tag] : [...tagHistory];

        const tagsToExclude = [...tagHistory, ...m_config.filterTags];

        var query = getQuery(requiredTags,
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


    async function populateTooltip(tooltip, data) {
        var tag = data.name;
        var requiredTags = tag ? [...data.tagHistory, tag] : [...data.tagHistory];

        var requiredTagsString = requiredTags.map(tag =>
            `${tag}`).join(", ");

        var fileQuery = getQuery(requiredTags,
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
            //console.log("ran query ", fileQuery);

            tooltip.selectAll("*").remove();



            var documentString = "document";
            if (data.value != 1) {
                documentString = "documents";
            }
            tooltip.append("span")
                .attr("class", "tagvis-tooltip-header")
                //.text(`Found ${data.value} ${documentString} containing: ${tags}`);             
                .text(`${requiredTagsString}`);
            tooltip.append("br")

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
        showTooltip(event, data);

    }

    function mouseleftVisNode(event: MouseEvent, data: DataNode) {
    }

    function showTooltip(event: MouseEvent, data: DataNode) {
        populateTooltip(tooltip, data);

        tooltip.style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("display", "block")

        tooltip.on("mouseleave", function () {
            hideTooltip();
        })
    }

    function hideTooltip() {
        tooltip.style("display", "none")
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
    var tagsInChild = child.tagHistory ?
        [...child.tagHistory, child.name] : [...child.name];
    tagsInChild.sort();
    var tagsInChildSet = new Set(tagsInChild);
    var tagsInChilString = [...tagsInChildSet].map(tag =>
        `${tag}`).join(", ");

    if (uniqueTags.contains(tagsInChilString)) {
        return false;
    } else {
        uniqueTags.push(tagsInChilString);
        return true;
    }
}

