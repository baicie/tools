import { describe, expect, it } from 'vitest'
import {
  isAlphanumeric,
  isBase64,
  isChinese,
  isCreditCard,
  isEmail,
  isEnglish,
  isHexColor,
  isIPv4,
  isIPv6,
  isIdCard,
  isJSON,
  isLicensePlate,
  isMac,
  isMediumPassword,
  isNumeric,
  isPhone,
  isPostalCode,
  isQQ,
  isStrongPassword,
  isUrl,
  isUsername,
  isWeChat,
} from '../src/validate'

describe('isEmail', () => {
  it('应该验证正确的邮箱', () => {
    expect(isEmail('test@example.com')).toBe(true)
    expect(isEmail('user.name@domain.co.uk')).toBe(true)
    expect(isEmail('user+tag@gmail.com')).toBe(true)
  })

  it('应该拒绝无效的邮箱', () => {
    expect(isEmail('invalid')).toBe(false)
    expect(isEmail('test@')).toBe(false)
    expect(isEmail('@domain.com')).toBe(false)
    expect(isEmail('test@domain')).toBe(false)
    expect(isEmail('')).toBe(false)
  })
})

describe('isPhone', () => {
  it('应该验证正确的手机号', () => {
    expect(isPhone('13800138000')).toBe(true)
    expect(isPhone('15912345678')).toBe(true)
    expect(isPhone('18612345678')).toBe(true)
  })

  it('应该拒绝无效的手机号', () => {
    expect(isPhone('12345678901')).toBe(false)
    expect(isPhone('1380013800')).toBe(false)
    expect(isPhone('23800138000')).toBe(false)
    expect(isPhone('abc')).toBe(false)
  })
})

describe('isIdCard', () => {
  it('应该验证正确的身份证号', () => {
    // 计算正确的校验码: 11010119900307441X
    expect(isIdCard('11010519491231002X')).toBe(true)
  })

  it('应该拒绝无效的身份证号', () => {
    expect(isIdCard('123456789012345678')).toBe(false)
    expect(isIdCard('abcdefghijklmnop')).toBe(false)
  })
})

describe('isUrl', () => {
  it('应该验证正确的URL', () => {
    expect(isUrl('https://example.com')).toBe(true)
    expect(isUrl('http://example.com')).toBe(true)
    expect(isUrl('https://example.com/path')).toBe(true)
    expect(isUrl('https://example.com:8080')).toBe(true)
  })

  it('应该拒绝无效的URL', () => {
    expect(isUrl('invalid')).toBe(false)
    expect(isUrl('example.com')).toBe(false)
    expect(isUrl('')).toBe(false)
  })
})

describe('isIPv4', () => {
  it('应该验证正确的IPv4地址', () => {
    expect(isIPv4('192.168.1.1')).toBe(true)
    expect(isIPv4('127.0.0.1')).toBe(true)
    expect(isIPv4('255.255.255.255')).toBe(true)
    expect(isIPv4('0.0.0.0')).toBe(true)
  })

  it('应该拒绝无效的IPv4地址', () => {
    expect(isIPv4('256.1.1.1')).toBe(false)
    expect(isIPv4('1.1.1')).toBe(false)
    expect(isIPv4('1.1.1.1.1')).toBe(false)
    expect(isIPv4('abc.def.ghi.jkl')).toBe(false)
  })
})

describe('isIPv6', () => {
  it('应该验证正确的IPv6地址', () => {
    expect(isIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
    expect(isIPv6('fe80:0000:0000:0000:0000:0000:0000:0001')).toBe(true)
  })

  it('应该拒绝无效的IPv6地址', () => {
    expect(isIPv6('192.168.1.1')).toBe(false)
    expect(isIPv6('not an ip')).toBe(false)
  })
})

describe('isMac', () => {
  it('应该验证正确的MAC地址', () => {
    expect(isMac('00:1B:44:11:3A:B7')).toBe(true)
    expect(isMac('00-1B-44-11-3A-B7')).toBe(true)
    expect(isMac('00:1b:44:11:3a:b7')).toBe(true)
  })

  it('应该拒绝无效的MAC地址', () => {
    expect(isMac('00:1B:44:11:3A')).toBe(false)
    expect(isMac('00:1B:44:11:3A:B7:99')).toBe(false)
    expect(isMac('not a mac')).toBe(false)
  })
})

describe('isCreditCard', () => {
  it('应该验证正确的信用卡号', () => {
    expect(isCreditCard('4111111111111111')).toBe(true)
    expect(isCreditCard('5500000000000004')).toBe(true)
  })

  it('应该拒绝无效的信用卡号', () => {
    expect(isCreditCard('1234567890123456')).toBe(false)
    expect(isCreditCard('abcd')).toBe(false)
  })
})

describe('isStrongPassword', () => {
  it('应该验证强密码', () => {
    expect(isStrongPassword('Password123!')).toBe(true)
    expect(isStrongPassword('Abc@1234')).toBe(true)
  })

  it('应该拒绝弱密码', () => {
    expect(isStrongPassword('weak')).toBe(false)
    expect(isStrongPassword('password123')).toBe(false)
    expect(isStrongPassword('PASSWORD123!')).toBe(false)
    expect(isStrongPassword('Pass1!')).toBe(false)
  })
})

describe('isMediumPassword', () => {
  it('应该验证中等密码', () => {
    expect(isMediumPassword('Abc123')).toBe(true)
    expect(isMediumPassword('test1234')).toBe(true)
  })

  it('应该拒绝不符合要求的密码', () => {
    expect(isMediumPassword('weak')).toBe(false)
    expect(isMediumPassword('123456')).toBe(false)
    expect(isMediumPassword('abcdefg')).toBe(false)
  })
})

describe('isUsername', () => {
  it('应该验证正确的用户名', () => {
    expect(isUsername('user123')).toBe(true)
    expect(isUsername('user_123')).toBe(true)
    expect(isUsername('UserName')).toBe(true)
  })

  it('应该拒绝无效的用户名', () => {
    expect(isUsername('user name')).toBe(false)
    expect(isUsername('123user')).toBe(false)
    expect(isUsername('us')).toBe(false)
  })
})

describe('isChinese/isEnglish', () => {
  it('应该验证中文', () => {
    expect(isChinese('你好')).toBe(true)
    expect(isChinese('你好世界')).toBe(true)
  })

  it('应该拒绝非中文', () => {
    expect(isChinese('hello')).toBe(false)
    expect(isChinese('你好123')).toBe(false)
  })

  it('应该验证英文', () => {
    expect(isEnglish('hello')).toBe(true)
    expect(isEnglish('HelloWorld')).toBe(true)
  })

  it('应该拒绝非英文', () => {
    expect(isEnglish('你好')).toBe(false)
    expect(isEnglish('hello123')).toBe(false)
  })
})

describe('isNumeric', () => {
  it('应该验证纯数字', () => {
    expect(isNumeric('12345')).toBe(true)
    expect(isNumeric('0')).toBe(true)
  })

  it('应该拒绝非数字', () => {
    expect(isNumeric('123a')).toBe(false)
    expect(isNumeric('12.3')).toBe(false)
  })
})

describe('isAlphanumeric', () => {
  it('应该验证字母数字', () => {
    expect(isAlphanumeric('abc123')).toBe(true)
    expect(isAlphanumeric('ABC123')).toBe(true)
    expect(isAlphanumeric('abc')).toBe(true)
    expect(isAlphanumeric('123')).toBe(true)
  })

  it('应该拒绝非字母数字', () => {
    expect(isAlphanumeric('abc_123')).toBe(false)
    expect(isAlphanumeric('abc 123')).toBe(false)
  })
})

describe('isHexColor', () => {
  it('应该验证十六进制颜色值', () => {
    expect(isHexColor('#ff0000')).toBe(true)
    expect(isHexColor('#f00')).toBe(true)
    expect(isHexColor('#FF0000')).toBe(true)
    expect(isHexColor('#abc')).toBe(true)
  })

  it('应该拒绝无效的颜色值', () => {
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor('#ff00000')).toBe(false)
    expect(isHexColor('#gg0000')).toBe(false)
  })
})

describe('isBase64', () => {
  it('应该验证Base64字符串', () => {
    expect(isBase64('SGVsbG8=')).toBe(true)
    expect(isBase64('SGVsbG8gV29ybGQ=')).toBe(true)
    expect(isBase64('YWJjZA==')).toBe(true)
  })

  it('应该拒绝无效的Base64', () => {
    expect(isBase64('not base64!')).toBe(false)
    expect(isBase64('YW===')).toBe(false)
  })
})

describe('isJSON', () => {
  it('应该验证JSON字符串', () => {
    expect(isJSON('{"a":1}')).toBe(true)
    expect(isJSON('{"name":"test","value":123}')).toBe(true)
    expect(isJSON('[1,2,3]')).toBe(true)
    expect(isJSON('"string"')).toBe(true)
    expect(isJSON('123')).toBe(true)
  })

  it('应该拒绝无效的JSON', () => {
    expect(isJSON('{a:1}')).toBe(false)
    expect(isJSON('not json')).toBe(false)
  })
})

describe('isPostalCode', () => {
  it('应该验证邮政编码', () => {
    expect(isPostalCode('100000')).toBe(true)
    expect(isPostalCode('518000')).toBe(true)
  })

  it('应该拒绝无效的邮政编码', () => {
    expect(isPostalCode('12345')).toBe(false)
    expect(isPostalCode('1234567')).toBe(false)
    expect(isPostalCode('abc')).toBe(false)
  })
})

describe('isQQ', () => {
  it('应该验证QQ号', () => {
    expect(isQQ('123456789')).toBe(true)
    expect(isQQ('10001')).toBe(true)
  })

  it('应该拒绝无效的QQ号', () => {
    expect(isQQ('1234')).toBe(false)
    expect(isQQ('012345678')).toBe(false)
    expect(isQQ('abc')).toBe(false)
  })
})

describe('isWeChat', () => {
  it('应该验证微信号', () => {
    expect(isWeChat('wxid_123456')).toBe(true)
    expect(isWeChat('wx123456')).toBe(true)
    expect(isWeChat('ABCDefg12345')).toBe(true)
  })

  it('应该拒绝无效的微信号', () => {
    expect(isWeChat('123wxid')).toBe(false)
    expect(isWeChat('wx')).toBe(false)
    expect(isWeChat('_wxid123456')).toBe(false)
  })
})

describe('isLicensePlate', () => {
  it('应该验证车牌号', () => {
    expect(isLicensePlate('京A12345')).toBe(true)
    expect(isLicensePlate('京AA123学')).toBe(true)
    expect(isLicensePlate('粤B1234D')).toBe(true)
  })

  it('应该拒绝无效的车牌号', () => {
    expect(isLicensePlate('12345')).toBe(false)
    expect(isLicensePlate('ABCDEFG')).toBe(false)
  })
})
