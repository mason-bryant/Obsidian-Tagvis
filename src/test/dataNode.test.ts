import { expect, describe, it } from '@jest/globals';
import { DataNode, updateChildren } from "../components/dataNode";

describe('updateChildren', () => {

    it('Should add a single node to an empty array', () => {
        let destinationNodes: DataNode[] = [];
        let sourceNodes: DataNode[] = [new DataNode("test", 42, [], [])];
        let expected: DataNode[] = [new DataNode("test", 42, [], [])];

        function updateFn(src: DataNode, dest: DataNode) {
            //console.log("Updating ", src.name, "with: ", dest.name);
            dest.children = src.children;
            dest.tagHistory = src.tagHistory;

            if (!dest.tagHistory) {
                dest.tagHistory = [];
            }

            /*
            let newTagHistory = tagHistory.slice();
            tagHistory.push(dest.name);
            if (depth < m_config.maxDepth) {
                //executeTagNodeQuery(dest.name, dest, dest.tagHistory, initialDepth);
            }
            */
        }

        function newNodeFn(src: DataNode) {
            //console.log("New ", src.name);

            if (!src.tagHistory) {
                src.tagHistory = [];
            }

            /*
            let newTagHistory = tagHistory.slice();
            tagHistory.push(src.name);
            if (depth < m_config.maxDepth) {
                executeTagNodeQuery(src.name, src, src.tagHistory, initialDepth);
            }
                */
        }

        updateChildren(destinationNodes, sourceNodes, newNodeFn, updateFn);

        console.log("expected", expected);
        console.log("result", destinationNodes);

        expect(destinationNodes).toEqual(expected);
        //expect(result.replace(/\s+/g, ' ')).toBe(expected.replace(/\s+/g, ' '));
    });


    it('Should update the data node with results value', () => {

        let data: DataNode[] = [new DataNode("test", 15, [], [])];
        let results: DataNode[] = [new DataNode("test", 42, [], [])];
        let expected: DataNode[] = [new DataNode("test", 42, [], [])];

        function updateFn(src: DataNode, dest: DataNode) {
            console.log("Updating ", src.name, "with: ", dest.name);

            /*
            let newTagHistory = tagHistory.slice();
            tagHistory.push(dest.name);
            if (depth < m_config.maxDepth) {
                //executeTagNodeQuery(dest.name, dest, dest.tagHistory, initialDepth);
            }
            */
        }

        function newNodeFn(src: DataNode) {
            //console.log("New ", src.name);

            if (!src.tagHistory) {
                src.tagHistory = [];
            }

            /*
            let newTagHistory = tagHistory.slice();
            tagHistory.push(src.name);
            if (depth < m_config.maxDepth) {
                executeTagNodeQuery(src.name, src, src.tagHistory, initialDepth);
            }
                */
        }

        updateChildren(data, results, newNodeFn, updateFn);

        console.log("expected", expected);
        console.log("result", data);

        expect(data.length).toEqual(expected.length);
        expect(data).toEqual(expected);
        //expect(result.replace(/\s+/g, ' ')).toBe(expected.replace(/\s+/g, ' '));
    });


});