// src/contexts/SortingContext.jsx
import { createContext, useRef, useState } from "react";

import { getRandomNumber, getDigit, mostDigits } from "../helpers/math";
import { awaitTimeout } from "../helpers/promises";

export const SortingContext = createContext();
const speedMap = {
    "slow": 1000,
    "normal": 500,
    "fast": 250
}

function SortingProvider({ children }) {
    const [sortingState, setSortingState] = useState({
        array: [],
        delay: speedMap["slow"],
        algorithm: "bubble_sort",
        sorted: false,
        sorting: false
    });

    // Refs to read live values inside async loops
    const pausedRef = useRef(false);
    const stoppedRef = useRef(false);
    const stateRef = useRef(sortingState);
    stateRef.current = sortingState;

    const changeBar = (index, payload) => {
        setSortingState((prev) => ({
            ...prev,
            array: prev.array.map((item, i) => (i === index ? { ...item, ...payload } : item)),
        }));
    };

    const generateSortingArray = (sorting) => {
        const generatedArray = Array.from({ length: 12 }, () => {
            return {
                value: getRandomNumber(60, 1000),
                state: "idle",
            };
        });

        // reset stopped / paused flags on new array
        pausedRef.current = false;
        stoppedRef.current = false;

        setSortingState((prev) => ({
            ...prev,
            array: generatedArray,
            sorted: false,
            sorting: sorting || false
        }))
    };

    // ---- Controlled await that respects pause/stop ----
    // use this instead of direct `await awaitTimeout(ms)`
    const controlledAwait = async (ms) => {
        const chunk = 30;
        let waited = 0;
        while (waited < ms) {
            if (stoppedRef.current) {
                // immediate abort if stopped
                throw new Error("sorting-stopped"); // will be caught by callers
            }
            if (pausedRef.current) {
                // while paused, wait but don't count toward ms
                // small poll so UI is responsive
                // eslint-disable-next-line no-await-in-loop
                await awaitTimeout(100);
                continue;
            }
            const next = Math.min(chunk, ms - waited);
            // eslint-disable-next-line no-await-in-loop
            await awaitTimeout(next);
            waited += next;
        }
    };

    // ---- sorting algorithms (kept as original but using controlledAwait) ----

    const bubbleSort = async () => {
        const arr = sortingState.array.map((item) => item.value);

        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr.length - i - 1; j++) {
                // abort check
                if (stoppedRef.current) throw new Error("sorting-stopped");

                changeBar(j, { state: "selected" });
                changeBar(j + 1, { state: "selected" });
                await controlledAwait(sortingState.delay);

                if (arr[j] > arr[j + 1]) {
                    let temp = arr[j];
                    arr[j] = arr[j + 1];
                    changeBar(j, { value: arr[j + 1] });
                    arr[j + 1] = temp;
                    changeBar(j + 1, { value: temp });
                    await controlledAwait(sortingState.delay);
                }

                changeBar(j, { state: "idle" });
                changeBar(j + 1, { state: "idle" });
            }
        }
    };

    const insertionSort = async () => {
        const arr = sortingState.array.map((item) => item.value);

        for (let i = 1; i < arr.length; i++) {
            if (stoppedRef.current) throw new Error("sorting-stopped");
            let current = arr[i];
            let j = i - 1;

            changeBar(i, { value: current, state: "selected" });

            while (j > -1 && current < arr[j]) {
                if (stoppedRef.current) throw new Error("sorting-stopped");
                arr[j + 1] = arr[j];
                changeBar(j + 1, { value: arr[j], state: "selected" });
                j--;
                await controlledAwait(sortingState.delay);
                changeBar(j + 2, { value: arr[j + 1], state: "idle" });
            }

            arr[j + 1] = current;
            changeBar(j + 1, { value: current, state: "idle" });
        }
    };

    const selectionSort = async () => {
        const arr = sortingState.array.map((item) => item.value);

        for (let i = 0; i < arr.length; i++) {
            if (stoppedRef.current) throw new Error("sorting-stopped");
            let min = i;
            changeBar(min, { state: "selected" });

            for (let j = i + 1; j < arr.length; j++) {
                if (stoppedRef.current) throw new Error("sorting-stopped");
                changeBar(j, { state: "selected" });
                await controlledAwait(sortingState.delay);

                if (arr[j] < arr[min]) {
                    changeBar(min, { state: "idle" });
                    min = j;
                    changeBar(min, { state: "selected" });
                } else {
                    changeBar(j, { state: "idle" });
                }
            }

            if (min !== i) {
                let temp = arr[i];
                arr[i] = arr[min];
                changeBar(i, { value: arr[min], state: "idle" });
                arr[min] = temp;
                changeBar(min, { value: temp, state: "idle" });
            } else {
                changeBar(i, { state: "idle" });
                changeBar(min, { state: "idle" });
            }
        }
    };

    const mergeSort = async () => {
        const arr = sortingState.array.map((item) => item.value);
        await mergeSortHelper(arr);
    };
    async function mergeSortHelper(arr, start = 0, end = arr.length - 1) {
        if (start >= end) return;
        if (stoppedRef.current) throw new Error("sorting-stopped");

        const middle = Math.floor((start + end) / 2);
        await mergeSortHelper(arr, start, middle);
        await mergeSortHelper(arr, middle + 1, end);
        await mergeSortMerger(arr, start, middle, end);
    }
    async function mergeSortMerger(arr, start, middle, end) {
        if (stoppedRef.current) throw new Error("sorting-stopped");
        let left = arr.slice(start, middle + 1);
        let right = arr.slice(middle + 1, end + 1);

        let i = 0,
            j = 0,
            k = start;

        while (i < left.length && j < right.length) {
            if (stoppedRef.current) throw new Error("sorting-stopped");
            if (left[i] < right[j]) {
                changeBar(k, { value: left[i], state: "selected" });
                arr[k++] = left[i++];
            } else {
                changeBar(k, { value: right[j], state: "selected" });
                arr[k++] = right[j++];
            }
            await controlledAwait(sortingState.delay);
        }

        while (i < left.length) {
            if (stoppedRef.current) throw new Error("sorting-stopped");
            changeBar(k, { value: left[i], state: "selected" });
            arr[k++] = left[i++];
            await controlledAwait(sortingState.delay);
        }

        while (j < right.length) {
            if (stoppedRef.current) throw new Error("sorting-stopped");
            changeBar(k, { value: right[j], state: "selected" });
            arr[k++] = right[j++];
            await controlledAwait(sortingState.delay);
        }

        for (let i = start; i <= end; i++) {
            changeBar(i, { value: arr[i], state: "idle" });
        }
    }

    const quickSort = async () => {
        const arr = sortingState.array.map((item) => item.value);
        await quickSortHelper(arr);
    };
    const quickSortHelper = async (arr, start = 0, end = arr.length - 1) => {
        if (start >= end) {
            return;
        }
        if (stoppedRef.current) throw new Error("sorting-stopped");

        const pivot = arr[Math.floor((start + end) / 2)];
        let i = start;
        let j = end;

        while (i <= j) {
            if (stoppedRef.current) throw new Error("sorting-stopped");
            while (arr[i] < pivot) i++;
            while (arr[j] > pivot) j--;

            if (i <= j) {
                [arr[i], arr[j]] = [arr[j], arr[i]];
                changeBar(i, { value: arr[i], state: "selected" });
                changeBar(j, { value: arr[j], state: "selected" });

                await controlledAwait(sortingState.delay);

                changeBar(i, { value: arr[i], state: "idle" });
                changeBar(j, { value: arr[j], state: "idle" });
                i++;
                j--;
            }
        }

        await quickSortHelper(arr, start, j);
        await quickSortHelper(arr, i, end);
    }

    const radixSort = async () => {
        let arr = sortingState.array.map((item) => item.value);
        let maxDigitCount = mostDigits(arr);

        for (let k = 0; k < maxDigitCount; k++) {
            if (stoppedRef.current) throw new Error("sorting-stopped");
            let digitBuckets = Array.from({ length: 10 }, () => []);
            for (let i = 0; i < arr.length; i++) {
                let digit = getDigit(arr[i], k);
                digitBuckets[digit].push(arr[i]);
            }

            arr = [].concat(...digitBuckets);

            for (let i = 0; i < arr.length; i++) {
                if (stoppedRef.current) throw new Error("sorting-stopped");
                changeBar(i, { value: arr[i], state: "selected" });
                await controlledAwait(sortingState.delay);
                changeBar(i, { value: arr[i], state: "idle" });
            }
        }
    };

    const algorithmMap = {
        "bubble_sort": bubbleSort,
        "insertion_sort": insertionSort,
        "selection_sort": selectionSort,
        "merge_sort": mergeSort,
        "quick_sort": quickSort,
        "radix_sort": radixSort
    }

    // ---- Control APIs ----

    const pauseSorting = () => {
        pausedRef.current = true;
    };

    const resumeSorting = () => {
        pausedRef.current = false;
    };

    const stopSorting = () => {
        // set stopped, unpause, and mark sorting false in state so UI updates
        stoppedRef.current = true;
        pausedRef.current = false;
        setSortingState((s) => ({ ...s, sorting: false }));
    };

    // ---- startVisualizing: calls chosen algorithm and handles aborts ----
    const startVisualizing = async () => {
        // reset stopped/paused before starting
        stoppedRef.current = false;
        pausedRef.current = false;

        setSortingState((prev) => ({
            ...prev,
            sorting: true
        }))

        try {
            await algorithmMap[stateRef.current.algorithm]();
            // if finished normally and not stopped
            if (!stoppedRef.current) {
                setSortingState((prev) => ({
                    ...prev,
                    sorted: true,
                    sorting: false
                }))
            } else {
                // stopped mid-way
                setSortingState((prev) => ({
                    ...prev,
                    sorting: false
                }))
            }
        } catch (err) {
            // If we aborted via throw("sorting-stopped") just ignore - set sorting false
            if (err && err.message === "sorting-stopped") {
                setSortingState((prev) => ({ ...prev, sorting: false }));
            } else {
                // unexpected error - also clear sorting flag
                console.error(err);
                setSortingState((prev) => ({ ...prev, sorting: false }));
            }
        }
    }

    const changeSortingSpeed = (e) => {
        setSortingState((prev) => ({
            ...prev,
            delay: speedMap[e.target.value] || 500
        }))
    }

    const changeAlgorithm = (algorithm) => {
        setSortingState((prev) => ({
            ...prev,
            algorithm
        }))
    }

    return (
        <SortingContext.Provider
            value={{
                sortingState,
                generateSortingArray,
                startVisualizing,
                changeSortingSpeed,
                changeAlgorithm,
                pauseSorting,
                resumeSorting,
                stopSorting,
                paused: pausedRef.current
            }}
        >
            {children}
        </SortingContext.Provider>
    );
}

export default SortingProvider;
