import test from "tape";
import Immutable from "immutable";
import SearchUtility from "./SearchUtility";
import { INDEX_MODES } from "./constants";

const documentA = Immutable.fromJS({
  id: 1,
  name: "One",
  description: "The first document"
});
const documentB = Immutable.fromJS({
  id: 2,
  name: "Two",
  description: "The second document"
});
const documentC = Immutable.fromJS({
  id: 3,
  name: "Three",
  description: "The third document"
});
const documentD = Immutable.fromJS({
  id: 4,
  name: "楌ぴ",
  description: "堦ヴ礯 ラ蝥曣んを 檨儯饨䶧"
});
const documentE = Immutable.fromJS({
  id: 5,
  name: "ㄨ穯ゆ姎囥",
  description: "楌ぴ 堦ヴ礯 ラ蝥曣んを 檨儯饨䶧䏤"
});
const documentF = Immutable.fromJS({
  id: 6,
  name: "Six",
  description: "Este es el sexto/6o documento"
});
const documents = [
  documentA,
  documentB,
  documentC,
  documentD,
  documentE,
  documentF
];

function init({ indexMode, tokenize, sanitize } = {}) {
  const searchUtility = new SearchUtility({ indexMode, tokenize, sanitize });

  documents.forEach(doc => {
    searchUtility.indexDocument(doc.get("id"), doc.get("name"));
    searchUtility.indexDocument(doc.get("id"), doc.get("description"));
  });

  return searchUtility;
}

test("SearchUtility should return documents ids for any searchable field matching a query", t => {
  const searchUtility = init();
  let ids = searchUtility.search("One");
  t.equal(ids.length, 1);
  t.deepLooseEqual(ids, [1]);

  ids = searchUtility.search("Third");
  t.equal(ids.length, 1);
  t.deepLooseEqual(ids, [3]);

  ids = searchUtility.search("the");
  t.equal(ids.length, 3);
  t.deepLooseEqual(ids, [1, 2, 3]);

  ids = searchUtility.search("楌"); // Tests matching of other script systems
  t.equal(ids.length, 2);
  t.deepLooseEqual(ids, [4, 5]);
  t.end();
});

test("SearchUtility should return documents ids only if document matches all tokens in a query", t => {
  const searchUtility = init();
  let ids = searchUtility.search("the second");
  t.equal(ids.length, 1);
  t.equal(ids[0], 2);

  ids = searchUtility.search("three document"); // Spans multiple fields
  t.equal(ids.length, 1);
  t.equal(ids[0], 3);
  t.end();
});

test("SearchUtility should return an empty array for query without matching documents", t => {
  const searchUtility = init();
  const ids = searchUtility.search("four");
  t.equal(ids.length, 0);
  t.end();
});

test("SearchUtility should return all uids for an empty query", t => {
  const searchUtility = init();
  const ids = searchUtility.search("");
  t.equal(ids.length, documents.length);
  t.end();
});

test("SearchUtility should ignore case when searching", t => {
  const searchUtility = init();
  const texts = ["one", "One", "ONE"];
  texts.forEach(text => {
    const ids = searchUtility.search(text);
    t.equal(ids.length, 1);
    t.equal(ids[0], 1);
  });

  t.end();
});

test("SearchUtility should use substring matching", t => {
  const searchUtility = init();
  let texts = ["sec", "second", "eco", "cond"];
  texts.forEach(text => {
    let ids = searchUtility.search(text);
    t.equal(ids.length, 1);
    t.equal(ids[0], 2);
  });

  texts = ["堦", "堦ヴ", "堦ヴ礯", "ヴ", "ヴ礯"];
  texts.forEach(text => {
    let ids = searchUtility.search(text);
    t.equal(ids.length, 2);
    t.deepLooseEqual(ids, [4, 5]);
  });

  t.end();
});

test("SearchUtility should allow custom indexing via indexDocument", t => {
  const searchUtility = init();
  const text = "xyz";
  let ids = searchUtility.search(text);
  t.equal(ids.length, 0);

  const id = documentA.get("id");
  searchUtility.indexDocument(id, text);

  ids = searchUtility.search(text);
  t.equal(ids.length, 1);
  t.equal(ids[0], 1);
  t.end();
});

test("SearchUtility should recognize an :indexMode constructor param", t => {
  const searchUtility = new SearchUtility({
    indexMode: INDEX_MODES.EXACT_WORDS
  });
  t.equal(searchUtility.getIndexMode(), INDEX_MODES.EXACT_WORDS);
  t.end();
});

test("SearchUtility should update its default :indexMode when :setIndexMode() is called", t => {
  const searchUtility = new SearchUtility();
  searchUtility.setIndexMode(INDEX_MODES.EXACT_WORDS);
  t.equal(searchUtility.getIndexMode(), INDEX_MODES.EXACT_WORDS);
  t.end();
});

test("SearchUtility should should error if :setIndexMode() is called after an index has been created", t => {
  let errored = false;
  const searchUtility = init();
  try {
    searchUtility.indexDocument({});
    searchUtility.setIndexMode(INDEX_MODES.EXACT_WORDS);
  } catch (error) {
    errored = true;
  }
  t.equal(errored, true);
  t.end();
});

test("SearchUtility should support PREFIXES :indexMode", t => {
  const searchUtility = init({ indexMode: INDEX_MODES.PREFIXES });
  const match1 = ["fir", "first"];
  const match2 = ["sec", "second"];
  match1.forEach(token => {
    t.deepLooseEqual(searchUtility.search(token), [1]);
  });
  match2.forEach(token => {
    t.deepLooseEqual(searchUtility.search(token), [2]);
  });
  const noMatch = ["irst", "rst", "st", "irs", "ond", "econd", "eco"];
  noMatch.forEach(token => {
    t.equal(searchUtility.search(token).length, 0);
  });
  t.end();
});

test("SearchUtility should support EXACT_WORDS :indexMode", t => {
  const searchUtility = init({ indexMode: INDEX_MODES.EXACT_WORDS });
  t.deepLooseEqual(searchUtility.search("first"), [1]);
  t.deepLooseEqual(searchUtility.search("second"), [2]);
  const noMatch = ["irst", "rst", "st", "irs", "ond", "econd", "eco"];
  noMatch.forEach(token => {
    t.equal(searchUtility.search(token).length, 0);
  });
  t.end();
});

test("SearchUtility should support custom tokenizer", t => {
  const searchUtility = init({
    indexMode: INDEX_MODES.EXACT_WORDS,
    tokenize: text => text.split(/[^a-z0-9]+/).filter(text => text)
  });
  t.deepLooseEqual(searchUtility.search("sexto"), [6]);
  t.deepLooseEqual(searchUtility.search("6o"), [6]);
  t.end();
});

test("SearchUtility should support custom sanitizer", t => {
  const searchUtility = init({
    indexMode: INDEX_MODES.EXACT_WORDS,
    sanitize: text => text.trim()
  });
  t.equal(searchUtility.search("First").length, 0);
  t.deepLooseEqual(searchUtility.search("first"), [1]);
  t.end();
});
