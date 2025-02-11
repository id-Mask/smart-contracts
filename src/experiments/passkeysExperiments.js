import { Field, createForeignCurve, Crypto } from 'o1js';

const chars = 'qaJp7BwUkIObDyRE5o_xNg';

const asciiArray = [...chars].map((char) =>
  Field(char.charCodeAt(0)).toString()
);
console.log(asciiArray);

const value = Field(
  parseInt([...chars].map((char) => char.charCodeAt(0)).join(''))
);
console.log(value, value.toString());

// Convert string to concatenated ASCII values
const encodeToAsciiNumber = (str) => {
  return BigInt(
    str
      .split('')
      .map((char) => char.charCodeAt(0))
      .join('')
  );
};

// Convert concatenated ASCII values back to string
const decodeFromAsciiNumber = (num) => {
  const strNum = num.toString();
  const result = [];
  let i = 0;

  while (i < strNum.length) {
    // Try 3-digit ASCII first (for values >= 100)
    if (i + 2 < strNum.length) {
      const asciiVal = parseInt(strNum.slice(i, i + 3));
      if (asciiVal <= 127) {
        // Valid ASCII range
        result.push(String.fromCharCode(asciiVal));
        i += 3;
        continue;
      }
    }

    // Try 2-digit ASCII
    if (i + 1 < strNum.length) {
      const asciiVal = parseInt(strNum.slice(i, i + 2));
      if (asciiVal <= 127) {
        result.push(String.fromCharCode(asciiVal));
        i += 2;
        continue;
      }
    }

    // Single digit
    const asciiVal = parseInt(strNum[i]);
    result.push(String.fromCharCode(asciiVal));
    i += 1;
  }

  return result.join('');
};

// Test cases
const testStrings = ['ABC1', 'Hello123', 'Test@123', 'qaJp7BwUkIObDyRE5o_xNg'];

// Run tests
testStrings.forEach((testStr) => {
  const encoded = encodeToAsciiNumber(testStr);
  const decoded = decodeFromAsciiNumber(encoded);

  console.log(`Original: ${testStr}`);
  console.log(`Encoded: ${encoded}`);
  console.log(`Decoded: ${decoded}`);
  console.log(`Success: ${testStr === decoded}\n`);
});
