/**
 * Curated pool of recognizable, well-connected artists used to generate
 * daily / random challenges. IDs verified against the live api-enhanced.
 * Mainstream pop artists have many 合唱 (duet) tracks => rich graph edges.
 */
export interface Seed {
  id: number;
  name: string;
}

export const SEEDS: Seed[] = [
  { id: 6452, name: '周杰伦' },
  { id: 3684, name: '林俊杰' },
  { id: 7763, name: 'G.E.M.邓紫棋' },
  { id: 2116, name: '陈奕迅' },
  { id: 13193, name: '五月天' },
  { id: 5781, name: '薛之谦' },
  { id: 4292, name: '李荣浩' },
  { id: 861777, name: '华晨宇' },
  { id: 10559, name: '张惠妹' },
  { id: 12138269, name: '毛不易' },
  { id: 7219, name: '蔡依林' },
  { id: 5346, name: '王力宏' },
  { id: 1030001, name: '周深' },
  { id: 9548, name: '田馥甄' },
  { id: 9272, name: '孙燕姿' },
];
