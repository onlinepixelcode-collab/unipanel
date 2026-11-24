// Renders every page of a PDF to JPEG: swift pdf-pages.swift in.pdf outDir widthPx
import PDFKit
import AppKit
let args = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: args[1]))!
let out = args[2]
let width = CGFloat(Double(args[3]) ?? 1600)
for i in 0..<doc.pageCount {
  let page = doc.page(at: i)!
  let box = page.bounds(for: .mediaBox)
  let size = NSSize(width: width, height: width * box.height / box.width)
  let img = page.thumbnail(of: size, for: .mediaBox)
  let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
  let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.82])!
  try! data.write(to: URL(fileURLWithPath: "\(out)/p-\(String(format: "%02d", i + 1)).jpg"))
}
print("rendered \(doc.pageCount) pages")
