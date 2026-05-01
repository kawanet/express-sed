// Express 4 系列でのテストエントリ。
import express from "express4";
import {sharedTests} from "./lib/shared.ts";

sharedTests(express, "sed.express4.test.ts");
