const updateParserState = (state, index, result) => ({
  ...state,
  index,
  result
});

const updateParserResult = (state, result) => ({
  ...state,
  result
});

const updateParserError = (state, errorMsg) => ({
  ...state,
  isError: true,
  error: errorMsg
});
////////////////////////////~~~PARSER-CLASS~~~//////////////////////////////////

class Parser {
  constructor(parserStateTransformerFn) {
    this.parserStateTransformerFn = parserStateTransformerFn;
  }
////////////////////////////~~~RUN~~~///////////////////////////////////////////

  run(targetString) {
    const initialState = {
      targetString,
      index: 0,
      result: null,
      isError: false,
      error: null
    };

    return this.parserStateTransformerFn(initialState);
  }
////////////////////////////~~~MAP~~~///////////////////////////////////////////

  map(fn) {
    return new Parser(parserState => {
      const nextState = this.parserStateTransformerFn(parserState);

      if(nextState.isError) return nextState;


      return updateParserResult(nextState, fn(nextState.result));
    });
  }
//////////////////////////~~~CHAIN~~~///////////////////////////////////////////

  chain(fn) {
    return new Parser(parserState => {
      const nextState = this.parserStateTransformerFn(parserState);

      if(nextState.isError) return nextState;

      const nextParser = fn(nextState.result);

      return nextParser.parserStateTransformerFn(nextState);
    });
  }
//////////////////////////~~~ERROR-MAP~~~///////////////////////////////////////

  errorMap(fn) {
    return new Parser(parserState => {
      const nextState = this.parserStateTransformerFn(parserState);

      if(!nextState.isError) return nextState;


      return updateParserError(nextState, fn(nextState.error, nextState.index));
    });
  }

}
////////////////////////////////////////////////////////////////////////////////
////////////////////////~~~STRING-PARSER~~~/////////////////////////////////////

const str = s => new Parser(parserState => {
  const {
    targetString,
    index,
    isError
  } = parserState;

  //propogate any error that occurs in our parsing system
  //benefit is that we do not need to try and catch any unexpected error
  if(isError) {
    return parserState;
  }

  const slicedTarget = targetString.slice(index)

  if(slicedTarget.length === 0) {
    return updateParserError(parseState, `str: Attempted to match "${s}", but received unexpected EOI`);
  }

  if(slicedTarget.startsWith(s)){
    //successful - return string
    return updateParserState(parserState, index + s.length, s)
  }

  return updateParserError(
    parserState,
    `Attempted to match "${s}", but received "${targetString.slice(index,index + 10)}"`
  );
})
///////////////////////////~~~LETTERS~~~////////////////////////////////////////

const lettersRegex = /^[A-Za-z]+/;
const letters = new Parser(parserState => {
  const {
    targetString,
    index,
    isError
  } = parserState;

  //propogate any error that occurs in our parsing system
  //benefit is that we do not need to try and catch any unexpected error
  //ifError - append of chain
  if(isError) {
    return parserState;
  }

  //slice string to current index
  const slicedTarget = targetString.slice(index);

  //EOI Error
  if(slicedTarget.length === 0) {
    return updateParserError(parserState, `letters: Received unexpected EOI`);
  }

  //if successfully matched - return an array
  //first element of array will be what it had matched
  //will return NULL on failure
  const regexMatch = slicedTarget.match(lettersRegex);

  if(regexMatch){
    //successful - return string
    return updateParserState(parserState, index + regexMatch[0].length, regexMatch[0]);
  }

  return updateParserError(
    parserState,
    `letters: Unable to match letters at index ${index}`
  );
})
///////////////////////////////~~~DIGITS~~~/////////////////////////////////////

const digitsRegex = /^[0-9]+/;
const digits = new Parser(parserState => {
  const {
    targetString,
    index,
    isError
  } = parserState;

  //propogate any error that occurs in our parsing system
  //benefit is that we do not need to try and catch any unexpected error
  //ifError - append of chain
  if(isError) {
    return parserState;
  }

  //slice string to current index
  const slicedTarget = targetString.slice(index);

  //EOI Error
  if(slicedTarget.length === 0) {
    return updateParserError(parserState, `letters: Received unexpected EOI`);
  }

  //if successfully matched - return an array
  //first element of array will be what it had matched
  //will return NULL on failure
  const regexMatch = slicedTarget.match(digitsRegex);

  if(regexMatch){
    //successful - return string
    return updateParserState(parserState, index + regexMatch[0].length, regexMatch[0]);
  }

  return updateParserError(
    parserState,
    `letters: Unable to match letters at index ${index}`
  );
})
//////////////////////////~~~SEQUENCE OF~~~/////////////////////////////////////

const sequenceOf = parsers => new Parser(parserState => {
  if(parserState.isError) {
    return parserState;
  }

  const results = [];
  let nextState = parserState;

  for (let p of parsers)  {
    nextState = p.parserStateTransformerFn(nextState);
    results.push(nextState.result);
  }

  if(nextState.isError) {
      return nextState;
  }

  return updateParserResult(nextState, results);
})
/////////////////////////////~~~CHOICE~~~///////////////////////////////////////

const choice = parsers => new Parser(parserState => {
  if(parserState.isError) {
    return parserState;
  }

  for(let p of parsers) {
    const nextState = p.parserStateTransformerFn(parserState);
    if(!nextState.isError)  {
      return nextState;
    }
  }

  return updateParserError(
    parserState,
    `choice: Unable to match with any parser at index ${parserState.index}`
  );
});
///////////////////////////////~~~MANY~~~///////////////////////////////////////

const many = parser => new Parser(parserState => {
  if(parserState.isError) {
    return parserState;
  }

  let nextState = parserState;
  const results = [];
  let done = false;

while(!done){
  let testState = parser.parserStateTransformerFn(nextState);

  if(!testState.isError)  {
    results.push(testState.result);
    nextState = testState;
  } else {
    done = true;
  }
}


  return updateParserResult(nextState, results);
});
///////////////////////////////~~~MANY1~~~//////////////////////////////////////

const many1 = parser => new Parser(parserState => {
  if(parserState.isError) {
    return parserState;
  }

  let nextState = parserState;
  const results = [];
  let done = false;

while(!done){
 let testState = parser.parserStateTransformerFn(nextState);

  if(!testState.isError)  {
    results.push(testState.result);
    nextState = testState;
  } else {
    done = true;
  }
}
  if(results.length === 0)  {
    return updateParserError(
      parserState,
      `many1: Unable to match any input using parser @ index ${parserState.index}`
    );
  }


  return updateParserResult(nextState, results);
});
///////////////////////////~~~SEPBY~~~//////////////////////////////////////////

const sepBy = separatorParser => valueParser => new Parser(parserState => {
  const results = [];
  let nextState = parserState;

  while (true)  {
    const thingWeWantState = valueParser.parserStateTransformerFn(nextState);
    if(thingWeWantState.isError)  {
      break;
    }
    results.push(thingWeWantState.result);
    nextState = thingWeWantState;

    const separatorState = separatorParser.parserStateTransformerFn(nextState);
    if(separatorState.isError)  {
      break;
    }
    nextState = separatorState;
  }
  return updateParserResult(nextState, results);
});
////////////////////////////~~~SEPBY1~~~////////////////////////////////////////

const sepBy1 = separatorParser => valueParser => new Parser(parserState => {
  if(parserState.isError) {
    return parserState;
  }


  const results = [];
  let nextState = parserState;

  while (true)  {
    const thingWeWantState = valueParser.parserStateTransformerFn(nextState);
    if(thingWeWantState.isError)  {
      break;
    }
    results.push(thingWeWantState.result);
    nextState = thingWeWantState;

    const separatorState = separatorParser.parserStateTransformerFn(nextState);
    if(separatorState.isError)  {
      break;
    }
    nextState = separatorState;
  }

  if(results.length === 0)  {
    return updateParserError(
      parserState,
      `sepBy1: Unable to capture any results at index ${parserState.index}`
    );
  }

  return updateParserResult(nextState, results);
});
//////////////////////////~~~BETWEEN~~~/////////////////////////////////////////

const between = (leftParser, rightParser) => contentParser => sequenceOf([
  leftParser,
  contentParser,
  rightParser
]).map(results => results[1]);
/////////////////////////~~~LAZY~~~/////////////////////////////////////////////

const lazy = parserThunk => new Parser(parserState => {
  const parser = parserThunk();
  return parser.parserStateTransformerFn(parserState);
});
////////////////////////////////////////////////////////////////////////////////
//using it~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//const betweenSquareBrackets = between(str('['), str(']'));
//const commaSeparated = sepBy(str(','));

//const value = lazy(() => choice([
//  digits,
//  arrayParser
//]));

//const arrayParser = betweenSquareBrackets(commaSeparated(value));

//console.log(
//arrayParser.run('[1,[2,[3],4],5]')
//)

module.exports = {
  str,
  letters,
  digits,
  sequenceOf,
  choice,
  many,
  many1,
  sepBy,
  sepBy1,
  between,
  lazy,

  Parser,

  updateParserState,
  updateParserResult,
  updateParserError,
};
