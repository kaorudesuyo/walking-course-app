import { NextResponse } from "next/server";

// コース生成はクライアントサイドで実行するためこのAPIは使用しない
// 古いコードからの呼び出しに備えてPOSTも204で返す
export async function GET() {
  return NextResponse.json({ message: "Use client-side API" }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ message: "Use client-side API" }, { status: 200 });
}
