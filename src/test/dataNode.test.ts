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

    it('Child nodes of the sourceData should be retained', () => {

        const parentNode = new DataNode("parent", 42, [], []);
        const childNode1 = new DataNode("child 1", 42, [], []);
        const childNode2 = new DataNode("child 2", 42, [], []);

        parentNode.children.push(childNode1);
        parentNode.children.push(childNode2);

        const data: DataNode[] = [parentNode];
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