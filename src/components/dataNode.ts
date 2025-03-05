

export class DataNode {
    m_name: string;
    value?: number;
    children: DataNode[];
    tagHistory: string[];

    id?: string;

    constructor(
        _name?: string,
        _value?: number,
        _children?: DataNode[],
        _tagHistory?: string[]
    ) {
        if (_name) {
            this.m_name = _name;
        } else {
            this.m_name = "#";
        }

        if (_value) {
            this.value = _value;
        }

        if (_children) {
            this.children = _children;
        } else {
            this.children = [];
        }

        if (_tagHistory) {
            this.tagHistory = _tagHistory;
        } else {
            this.tagHistory = [];
        }
    }

    get name() {
        return this.m_name;
    }

    set name(name: string) {
        this.m_name = name;
    }

    getTruncatedName(maxTagLength: number) {
        return this.name.length > maxTagLength
            ? this.name.substring(0, maxTagLength) + "..." : this.name;
    }
}

export function updateChildren(
    data: DataNode[],
    results: DataNode[],
    newNodeFn: (a: DataNode,) => void,
    updateFn: (a: DataNode, b: DataNode) => void,
    compareFn?: (a: DataNode, b: DataNode) => boolean
): void {

    if (!compareFn) {
        compareFn = function (a, b): boolean {
            if (a.name == b.name) {
                return true;
            }
            return false;
        }
    }

    //remove missing objects from destinationArray (data)
    for (let i = data.length - 1; i >= 0; i--) {
        if (!results.some(r => compareFn(r, data[i]))) {
            data.splice(i, 1);
        }
    }

    data.forEach(matchedSourceDataNode => {
        const matchedResultsNode = results.find(r => compareFn(r, matchedSourceDataNode));
        if (matchedResultsNode) {
            matchedSourceDataNode.tagHistory = matchedResultsNode.tagHistory;
            matchedSourceDataNode.value = matchedResultsNode.value;

            if (!matchedSourceDataNode.tagHistory) {
                matchedSourceDataNode.tagHistory = [];
            }

            updateFn(matchedResultsNode, matchedSourceDataNode);
        }
    });

    results.forEach(r => {
        if (!data.some(d => compareFn(d, r))) {
            data.push(r);
            newNodeFn(r);
        }
    });
}

