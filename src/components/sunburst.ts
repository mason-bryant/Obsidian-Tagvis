import {
    App,
} from "obsidian";

import * as d3 from "d3";
import { StarburstConfig } from "./config";
import { getQuery } from './tagQuery';
import { ObsidianD3jsSettings } from "./settings";
import { DataNode, updateChildren } from "./dataNode";



interface ArcDatum extends d3.HierarchyRectangularNode<DataNode> {
    data: DataNode;
}

export class Sunburst {
    private m_logNodeQuery = false;
    //-------- 

    private m_id: string;
    private m_config: StarburstConfig;
    private m_firstRun = true;
    private m_rootData: DataNode;
    private m_ignoreFilesWithTagsCached = "";
    private m_settings: ObsidianD3jsSettings;
    private m_app: App;

    private m_tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>;
    private m_g: d3.Selection<SVGGElement, unknown, null, undefined>;
    private m_svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

    //prevents re-running previous tag queries
    private uniqueTags: string[];

    init(app: App,
        _el: HTMLElement,
        settings: ObsidianD3jsSettings,
        config: StarburstConfig,
        id: string) {

        this.m_firstRun = true;
        this.m_config = config;
        this.m_app = app;
        this.m_settings = settings;
        this.m_rootData = new DataNode();
        this.m_id = id;
        this.m_rootData.id = this.m_id;

        const dv = (app as any).plugins.plugins["dataview"]?.api;
        if (!dv) {
            _el.innerText = `Tagviz Error: Dataview plugin is not enabled.`;
            return;
        }

        if (this.m_config.ignoreFilesWithTags.length > 0) {
            this.m_ignoreFilesWithTagsCached = this.m_config.ignoreFilesWithTags.map(tag =>
                `contains(file.tags, "${tag}") = false AND contains(file.etags, "${tag}") = false`)
                .join(" AND ");
            this.m_ignoreFilesWithTagsCached = " AND " + this.m_ignoreFilesWithTagsCached;
        }
        this.uniqueTags = [];

        if (!_el) {
            console.error("Invalid DOM element");
            return;
        }

        if ((this.m_config.layout.width > _el.clientWidth) && (_el.clientWidth > 0)) {
            this.m_config.layout.width = _el.clientWidth;
            if(this.m_settings.debugMessages) {
                console.log("Configured width is too large. Width adjusted to", this.m_config.layout.width);
            }
        }

        d3.select(_el).selectAll("*").remove();
        this.m_svg = d3.select(_el).append("span")
            .append("svg")
            .attr("id", "tagvis-root-svg")
            .attr("width", this.m_config.layout.width)
            .attr("height", this.m_config.layout.height)
            .attr("viewBox", `0 0 ${this.m_config.layout.width} ${this.m_config.layout.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("background", this.m_config.background);

        this.m_g = this.m_svg.append("g")
            .attr("id", "tagvis-root-g")
            .attr("transform", `translate(${this.m_config.layout.width / 2}, ${this.m_config.layout.height / 2})`)
            .attr("fill-opacity", 0.6);

        this.render();
    }

    getColorFunction() {

        switch (this.m_config.color) {

            case "interpolateCividis":
                return d3.scaleOrdinal(d3.quantize(d3.interpolateCividis, this.m_rootData.children.length + 1));
                break;
            case "interpolateCubehelixDefault":
                return d3.scaleOrdinal(d3.quantize(d3.interpolateCubehelixDefault,
                    this.m_rootData.children.length + 1));
                break;
            case "interpolateCool":
                return d3.scaleOrdinal(d3.quantize(d3.interpolateCool,
                    this.m_rootData.children.length + 1));
                break;
            case "interpolateBuPu":
                return d3.scaleOrdinal(d3.quantize(d3.interpolateBuPu,
                    this.m_rootData.children.length + 1));
                break;
            case "test":
                return d3.scaleOrdinal(d3.quantize(d3.interpolatePlasma,
                    this.m_rootData.children.length + 1));
                break;

        }

        return d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, this.m_rootData.children.length + 1));
    }

    render() {
        const format = d3.format(",d");

        const color = this.getColorFunction();
        const radius = Math.min(this.m_config.layout.width, this.m_config.layout.height) / 2 - 20;

        const partition = data => d3.partition()
            .size([2 * Math.PI, radius])(d3.hierarchy(data)
                .sum(d => d.value)
                .sort((a, b) => (b.value as number) - (a.value as number))) as ArcDatum;

        const arc = d3.arc<ArcDatum>()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);
        const root = partition(this.m_rootData);

        this.m_g.selectAll<SVGPathElement, ArcDatum>("path")
            .data(root.descendants().filter(d => d.depth) as ArcDatum[])
            .join("path")
            .attr("fill", d => { while (d.depth > 1) (d as any) = d.parent; return color(d.data.name); })
            .attr("d", arc)
            .attr("pointer-events", "auto")
            .on("click", ((event: MouseEvent, d: ArcDatum) => {
                this.onNodeClick(this.m_rootData, d.data.name);
            }))
            .on("mouseover", ((event: MouseEvent, d: ArcDatum) => {
                this.mouseoverVisNode(event, d.data);
            }))
            .on("mouseout", ((event: MouseEvent, d: ArcDatum) => {
                this.mouseleftVisNode(event, d.data);
            }))
            .append("title")
            .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value ?? 0)}`);

        this.m_g.selectAll("text")
            .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
            .join("text")
            .attr("transform", function (d) {
                const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                const y = (d.y0 + d.y1) / 2;
                return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
            })
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .attr("font-size", this.m_config.fontsize)
            .attr("font-family", "sans-serif")
            .on("click", ((event, d: ArcDatum) => {
                this.onNodeClick(this.m_rootData, d.data.name);
            }))
            .on("mouseover", ((event, d: ArcDatum) => {
                this.mouseoverVisNode(event, d.data);
            }))
            .on("mouseout", ((event, d: ArcDatum) => {
                this.mouseleftVisNode(event, d.data);
            }))
            .text(d => d.data.getTruncatedName(this.m_config.maxTagLength));

        this.m_g.append("circle")
            .attr("r", radius / 5)
            .attr("fill", "white")
            .attr("stroke", "black")
            .attr("stroke-width", 1);

        this.m_g.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("font-size", this.m_config.fontsize)
            .attr("font-family", "sans-serif")
            .text(root.data.name);

        if (this.m_firstRun) {
            this.m_firstRun = false;
            this.startQuery();
        }
    }

    mouseoverVisNode(event: MouseEvent, data: DataNode) {
        this.displayDocumentsTooltip(event, data);

    }

    mouseleftVisNode(event: MouseEvent, data: DataNode) {
    }

    displayDocumentsTooltip(event: MouseEvent, data: DataNode) {
        d3.selectAll("[id='obsidian-d3-tooltip']").remove();
        this.m_tooltip = d3.select("body").append("div")
            .attr("id", "obsidian-d3-tooltip")
            .attr("class", "tagvis-tooltip")
            .style("position", "absolute")
            .style("pointer-events", "auto")

        this.populateTooltip(this.m_tooltip, data);

        this.m_tooltip.style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("display", "block")

        this.m_tooltip.on("mouseleave", () => {
            this.hideTooltip();
        })
    }

    async populateTooltip(tooltip, data) {
        const tag = data.name;
        const requiredTags = tag ? [...data.tagHistory, tag] : [...data.tagHistory];
        const requiredTagsString = requiredTags.map(tag =>
            `${tag}`).join(", ");
        const fileQuery = getQuery(requiredTags,
            this.m_config.ignoreFilesWithTags,
            [], this.m_config.maxChildren, false);

        try {
            const dv = (this.m_app as any).plugins.plugins["dataview"]?.api;
            if (!dv) {
                console.error("Dataview plugin is not enabled.");
                return;
            }

            const result = await dv.query(fileQuery);

            if (!result.successful) {
                if(this.m_settings.debugMessages) {
                    console.log("query failed", fileQuery);
                }
                return;
            }
            tooltip.selectAll("*").remove();
            tooltip.append("span")
                .attr("class", "tagvis-tooltip-header")
                .text(`${requiredTagsString}`);
            tooltip.append("br")

            result.value.values.forEach(item => {
                const link = tooltip.append("a")
                    .attr("target", "_blank")
                    .attr("href", `obsidian://open?file=${item[0].path}`);
                link.text(item[1]);

                this.hookMarkdownLinkMouseEventHandlers(app, link, item[0].path, item[1]);
            });
            return result;
        } catch (error) {
            console.error("Dataview Query Error:", error);
        }
    }

    hideTooltip() {
        this.m_tooltip.style("display", "none")
    }


    onNodeClick(data: DataNode, name: string) {
        if(this.m_settings.debugMessages) {
            console.log("nodeClick with tag " + name);
        }
        this.startQuery(name)
    }

    hookMarkdownLinkMouseEventHandlers(
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

        if (!this.m_settings.displayLinkPreview) {
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

    isNodeUnique(child: DataNode) {
        const tagsInChild = child.tagHistory ?
            [...child.tagHistory, child.name] : [...child.name];
        tagsInChild.sort();
        const tagsInChildSet = new Set(tagsInChild);
        const tagsInChilString = [...tagsInChildSet].map(tag =>
            `${tag}`).join(", ");

        if (this.uniqueTags.contains(tagsInChilString)) {
            return false;
        } else {
            this.uniqueTags.push(tagsInChilString);
            return true;
        }
    }

    startQuery(initialTag?: string) {
        if (!initialTag) {
            initialTag = this.m_config.initialTag
        }
        this.uniqueTags = [];

        if (initialTag === null || initialTag === "") {
            this.executeTagNodeQuery(this.m_rootData, 0)
        } else {
            this.m_rootData.name = initialTag;
            this.executeTagNodeQuery(this.m_rootData, 1)
        }
    }

    async executeTagNodeQuery(
        data: DataNode,
        initialDepth: number) {
        const newTagHistory = data.tagHistory.slice();
        newTagHistory.push(data.name);
        const depth = newTagHistory.length + 1 - initialDepth;

        if (depth > this.m_config.maxDepth) {
            return;
        }

        await sleep(1);

        await this.runQuery(data.name, newTagHistory).then(result => {
            if (!result.successful) {
                if(this.m_settings.debugMessages) {
                    console.log("query failed");
                }
                return;
            }

            const queryResults: DataNode[] = [];

            result.value.values.forEach(item => {
                const tag = item[0];
                const child = new DataNode(tag, item[1], [], newTagHistory);

                if (this.isNodeUnique(child)) {
                    queryResults.push(child);
                }
            });

            const updateFn = ((src: DataNode, dest: DataNode) => {
                if (depth < this.m_config.maxDepth) {
                    this.executeTagNodeQuery(dest, initialDepth);
                }
            });

            const newNodeFn = ((src: DataNode) => {
                if (!src.tagHistory) {
                    src.tagHistory = [];
                }
                if (depth < this.m_config.maxDepth) {
                    this.executeTagNodeQuery(src, initialDepth);
                }
            });

            updateChildren(data.children, queryResults, newNodeFn, updateFn);

            this.render();
        });
    }

    async runQuery(tag, tagHistory) {
        const requiredTags = tag ? [...tagHistory, tag] : [...tagHistory];
        const tagsToExclude = [...tagHistory, ...this.m_config.filterTags];

        const query = getQuery(requiredTags,
            this.m_config.ignoreFilesWithTags,
            tagsToExclude, this.m_config.maxChildren);

        if (this.m_logNodeQuery) {
            if(this.m_settings.debugMessages) {
                console.log(`Running node query id: ${this.m_rootData.id}`, query);
            }
        }

        //TODO: Don't like the cast to any here
        const dv = (this.m_app as any).plugins.plugins["dataview"]?.api;
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
}
