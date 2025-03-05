import { expect, describe, it } from '@jest/globals';
import { DataNode, updateChildren } from "../components/dataNode";

describe('updateChildren', () => {

    it('Should add a single node to an empty array', () => {
        const destinationNodes: DataNode[] = [];
        const sourceNodes: DataNode[] = [new DataNode("test", 42, [], [])];
        const expected: DataNode[] = [new DataNode("test", 42, [], [])];

        function updateFn(src: DataNode, dest: DataNode) {
            dest.children = src.children;
            dest.tagHistory = src.tagHistory;

            if (!dest.tagHistory) {
                dest.tagHistory = [];
            }
        }

        function newNodeFn(src: DataNode) {
            if (!src.tagHistory) {
                src.tagHistory = [];
            }
        }

        updateChildren(destinationNodes, sourceNodes, newNodeFn, updateFn);

        console.log("expected", expected);
        console.log("result", destinationNodes);

        expect(destinationNodes).toEqual(expected);
    });


    it('Should update the data node with results value', () => {

        const data: DataNode[] = [new DataNode("test", 15, [], [])];
        const results: DataNode[] = [new DataNode("test", 42, [], [])];
        const expected: DataNode[] = [new DataNode("test", 42, [], [])];

        let isUpdated = false;
        function updateFn(src: DataNode, dest: DataNode) {
            console.log("Updating ", src.name, "with: ", dest.name);
            isUpdated = true;
        }

        function newNodeFn(src: DataNode) {
            if (!src.tagHistory) {
                src.tagHistory = [];
            }
        }

        updateChildren(data, results, newNodeFn, updateFn);

        console.log("expected", expected);
        console.log("result", data);

        expect(isUpdated);
        expect(data.length).toEqual(expected.length);
        expect(data).toEqual(expected);
    });


});