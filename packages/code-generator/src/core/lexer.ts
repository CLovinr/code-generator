const Lexer1_TYPE_STRING = "String";
const Lexer1_TYPE1 = "<%!";
const Lexer1_TYPE2 = "<%=";
const Lexer1_TYPE3 = "<%@";
const Lexer1_TYPE4 = "<%";
const Lexer1_TYPE5 = "%>";

class Lexer1 {
  private content: string;
  private parts: Array<{ type: string; value: any }> = [];
  private cache: string[] = [];
  private index = -1;
  private _length = 0;

  public constructor(content: string) {
    this.content = content;
  }

  public analyze() {
    this.goNext(this.start);
    if (this.cache.length) {
      this.newPartAndNext(Lexer1_TYPE_STRING);
    }
    this._length = this.parts.length;
  }

  public get length() {
    return this._length;
  }

  public getItem(index: number) {
    return index === this.length
      ? {
          type: Lexer1_TYPE_STRING,
          value: "",
        }
      : this.parts[index];
  }

  /**
   *
   * @param {Function} stateFun 下一个状态
   * @param {Object}
   */
  private goNext(stateFun: Function, isEffect: boolean = false) {
    if (isEffect) {
      stateFun.call(this);
    } else {
      this.index++;
      if (this.index <= this.content.length) {
        this.cache.push(this.get());
        stateFun.call(this);
      }
    }
  }

  private get() {
    return this.index === this.content.length ? "" : this.content[this.index];
  }

  /**
   *
   * @param {Object} type
   * @param {Object} backStep 回退的步数
   */
  private newPartAndNext(type: string, backStep: number = 0) {
    if (backStep) {
      this.index -= backStep;
      this.cache.splice(this.cache.length - backStep, backStep);
    }

    let part = {
      type: type,
      value: this.cache.join(""),
    };

    this.cache = [];
    this.parts.push(part);
    this.goNext(this.start);
    return part;
  }

  private start() {
    switch (this.get()) {
      case "<":
        this.goNext(this.state1);
        break;
      case "%":
        this.goNext(this.state9);
        break;
      default:
        this.goNext(this.state7);
        break;
    }
  }

  private state1() {
    if (this.get() === "%") {
      this.goNext(this.state2);
    } else if (this.get() === "<") {
      this.goNext(this.state8_effect, true);
    } else {
      this.goNext(this.state7);
    }
  }

  private state2() {
    switch (this.get()) {
      case "!":
        this.goNext(this.state3_effect, true);
        break;
      case "=":
        this.goNext(this.state4_effect, true);
        break;
      case "@":
        this.goNext(this.state5_effect, true);
        break;
      default:
        this.goNext(this.state6_effect, true);
    }
  }

  private state3_effect() {
    this.newPartAndNext(Lexer1_TYPE1);
  }

  private state4_effect() {
    this.newPartAndNext(Lexer1_TYPE2);
  }

  private state5_effect() {
    this.newPartAndNext(Lexer1_TYPE3);
  }

  private state6_effect() {
    this.newPartAndNext(Lexer1_TYPE4, 1);
  }

  private state7() {
    switch (this.get()) {
      case "<":
      case "%":
        this.goNext(this.state8_effect, true);
        break;
      default:
        this.goNext(this.state7);
    }
  }

  private state8_effect() {
    this.newPartAndNext(Lexer1_TYPE_STRING, 1);
  }

  private state9() {
    if (this.get() === ">") {
      this.goNext(this.state10_effect, true);
    } else {
      this.goNext(this.state7);
    }
  }

  private state10_effect() {
    this.newPartAndNext(Lexer1_TYPE5);
  }
}

/////////////////////////////
const LexerConfig_TYPE_ATTR = "attr";
const LexerConfig_TYPE_EQ = "=";
const LexerConfig_TYPE_VALUE = "value";

class LexerConfig {
  private content: string;
  private parts: Array<{
    type?: string;
    value: any;
  }> = [];
  private cache: string[] = [];
  private index = -1;
  private _length = 0;

  public constructor(content: string) {
    this.content = content;
  }

  public get length() {
    return this._length;
  }

  public analyze() {
    this.goNext(this.start);
    this._length = this.parts.length;
  }

  public getItem(index: number) {
    return this.parts[index];
  }

  private isName() {
    return /[a-zA-Z0-9_.$-]/.test(this.get());
  }

  /**
   *
   * @param {Function} stateFun 下一个状态
   */
  private goNext(stateFun: Function, isEffect: boolean = false) {
    if (isEffect) {
      stateFun.call(this);
    } else {
      this.index++;
      if (this.index <= this.content.length) {
        this.cache.push(this.get());
        stateFun.call(this);
      }
    }
  }

  /**
   *
   * @param {Object} type
   * @param {Object} backStep backStep 为0或undefined表示push当前字符到cache、并把index增加1，否则表示回退
   */
  private newPartAndNext(
    type: string | undefined,
    backStep: number | undefined = 0,
    ignore: boolean = false
  ) {
    let part;
    if (!ignore) {
      if (backStep) {
        this.index -= backStep;
        this.cache.splice(this.cache.length - backStep, backStep);
      }
      if (type === LexerConfig_TYPE_VALUE) {
        //移除引号
        this.cache.splice(0, 1);
        this.cache.splice(this.cache.length - 1, 1);
      }
      part = {
        type: type,
        value: this.cache.join(""),
      };
      this.parts.push(part);
    }
    this.cache = [];
    this.goNext(this.start);
    return part;
  }

  private get() {
    return this.index === this.content.length ? "" : this.content[this.index];
  }

  private start() {
    switch (this.get()) {
      case "'":
        this.goNext(this.state2);
        break;
      case '"':
        this.goNext(this.state4);
        break;
      case "=":
        this.goNext(this.state7_effect, true);
        break;
      default:
        if (this.isName()) {
          this.goNext(this.state1);
        } else {
          this.goNext(this.state8_effect, true);
        }
        break;
    }
  }

  private state1() {
    if (!this.isName()) {
      this.goNext(this.state6_effect, true);
    } else {
      this.goNext(this.state1);
    }
  }

  private state2() {
    if (this.get() === "'") {
      this.goNext(this.state3_effect, true);
    } else {
      this.goNext(this.state2);
    }
  }

  private state3_effect() {
    this.newPartAndNext(LexerConfig_TYPE_VALUE);
  }

  private state4() {
    if (this.get() === '"') {
      this.goNext(this.state5_effect, true);
    } else {
      this.goNext(this.state4);
    }
  }

  private state5_effect() {
    this.newPartAndNext(LexerConfig_TYPE_VALUE);
  }

  private state6_effect() {
    this.newPartAndNext(LexerConfig_TYPE_ATTR, 1);
  }

  private state7_effect() {
    this.newPartAndNext(LexerConfig_TYPE_EQ);
  }

  private state8_effect() {
    //忽略
    this.newPartAndNext(undefined, undefined, true);
  }
}

/////////////////////////

const TYPE_CONTENT = "Content";
const TYPE_LOCAL = "<%%>";
const TYPE_GLOBAL = "<%!%>";
const TYPE_SET = "<%=%>";
const TYPE_CONFIG = "<%@%>";

// function trimRL(str?: string) {
//   if (str) {
//     str = str.replace(/((\r\n)|(\n)|(\r))$/g, "");
//   }
//   return str;
// }

// function trimLL(str?: string) {
//   if (str) {
//     str = str.replace(/^((\r\n)|(\n)|(\r))/g, "");
//   }
//   return str;
// }

class Lexer2 {
  private lexer1: Lexer1;
  private parts: Array<{
    type: string;
    value: any;
  }> = [];
  private cache: Array<{
    type: string;
    value: any;
  }> = [];
  private index = -1;
  private _length = 0;

  public constructor(content: string) {
    this.lexer1 = new Lexer1(content);
    this.lexer1.analyze();
  }

  public get length() {
    return this._length;
  }

  public analyze() {
    this.goNext(this.start);
    if (this.cache.length) {
      this.newPartAndNext(TYPE_CONTENT);
    }
    this._length = this.parts.length;
  }

  public getItem(index: number) {
    return this.parts[index];
  }

  /**
   *
   * @param {Function} stateFun 下一个状态
   */
  private goNext(stateFun: Function, isEffect: boolean = false) {
    if (isEffect) {
      stateFun.call(this);
    } else {
      this.index++;
      if (this.index <= this.lexer1.length) {
        this.cache.push(this.lexer1.getItem(this.index));
        stateFun.call(this);
      }
    }
  }

  private get() {
    let v = this.lexer1.getItem(this.index);
    return v && v.type;
  }

  /**
   *
   * @param {Object} type
   * @param {Object} backStep backStep 为0或undefined表示push当前字符到cache、并把index增加1，否则表示回退
   */
  private newPartAndNext(type: string, backStep: number = 0) {
    if (backStep) {
      this.index -= backStep;
      this.cache.splice(this.cache.length - backStep, backStep);
    }
    if (type !== TYPE_CONTENT) {
      //移除包裹的关键字
      this.cache.splice(0, 1);
      this.cache.splice(this.cache.length - 1, 1);
    }
    let as = [];
    for (let i = 0; i < this.cache.length; i++) {
      let value = this.cache[i].value;
      as.push(value);
    }
    let part = {
      type: type,
      value: as.join(""),
    };
    this.cache = [];
    this.parts.push(part);
    this.goNext(this.start);
    return part;
  }

  private start() {
    switch (this.get()) {
      case "<%":
        this.goNext(this.state1);
        break;
      case "<%!":
        this.goNext(this.state2);
        break;
      case "<%=":
        this.goNext(this.state3);
        break;
      case "<%@":
        this.goNext(this.state4);
        break;
      default:
        this.goNext(this.state9);
        break;
    }
  }

  private isEffectStart() {
    switch (this.get()) {
      case "<%":
      case "<%!":
      case "<%=":
      case "<%@":
        return true;
      default:
        return false;
    }
  }

  private state1() {
    if (this.isEffectStart()) {
      this.goNext(this.state10_effect, true);
    } else {
      switch (this.get()) {
        case "%>":
          this.goNext(this.state5_effect, true);
          break;
        default:
          this.goNext(this.state1);
          break;
      }
    }
  }

  private state2() {
    if (this.isEffectStart()) {
      this.goNext(this.state10_effect, true);
    } else {
      switch (this.get()) {
        case "%>":
          this.goNext(this.state6_effect, true);
          break;
        default:
          this.goNext(this.state2);
          break;
      }
    }
  }

  private state3() {
    if (this.isEffectStart()) {
      this.goNext(this.state10_effect, true);
    } else {
      switch (this.get()) {
        case "%>":
          this.goNext(this.state7_effect, true);
          break;
        default:
          this.goNext(this.state3);
          break;
      }
    }
  }

  private state4() {
    if (this.isEffectStart()) {
      this.goNext(this.state10_effect, true);
    } else {
      switch (this.get()) {
        case "%>":
          this.goNext(this.state8_effect, true);
          break;
        default:
          this.goNext(this.state4);
          break;
      }
    }
  }

  private state5_effect() {
    this.newPartAndNext(TYPE_LOCAL);
  }

  private state6_effect() {
    this.newPartAndNext(TYPE_GLOBAL);
  }

  private state7_effect() {
    let part = this.newPartAndNext(TYPE_SET);
    part.value && (part.value = part.value.trim());
  }

  private state8_effect() {
    let part = this.newPartAndNext(TYPE_CONFIG);
    let lc = new LexerConfig(part.value);
    lc.analyze();
    let attrs: any = {};
    for (let i = 0; i < lc.length; i++) {
      let name = lc.getItem(i);
      let eq = lc.getItem(i + 1);
      let val = lc.getItem(i + 2);
      if (name.type === LexerConfig_TYPE_ATTR) {
        let value;
        if (
          eq &&
          eq.type === LexerConfig_TYPE_EQ &&
          val &&
          val.type === LexerConfig_TYPE_VALUE
        ) {
          value = val.value;
        }
        attrs[name.value] = value;
      }
    }
    part.value = attrs;
  }

  private state9() {
    if (this.isEffectStart()) {
      this.goNext(this.state10_effect, true);
    } else {
      this.goNext(this.state9);
    }
  }

  private state10_effect() {
    this.newPartAndNext(TYPE_CONTENT, 1);
  }
}

export { TYPE_CONTENT, TYPE_LOCAL, TYPE_GLOBAL, TYPE_SET, TYPE_CONFIG, Lexer2 };
