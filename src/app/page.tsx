import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Utensils, Calendar, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const currentDay = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <Header title="FitTrack" subtitle={currentDay} />
      <div className="p-4 space-y-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Hoş geldin! 💪</p>
            <h2 className="text-xl font-bold mt-1">4 Haftalık Program</h2>
            <p className="text-xs text-muted-foreground mt-1">
              96 kg → Hedef: Yağ yakımı + Kas tonusu
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary">🦵 Sağ diz menisküs</Badge>
              <Badge variant="secondary">🤚 Sol bilek</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Dumbbell className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold">4</p>
              <p className="text-xs text-muted-foreground">Hafta</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Utensils className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold">~2.200</p>
              <p className="text-xs text-muted-foreground">kcal/gün</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold">19:00</p>
              <p className="text-xs text-muted-foreground">Antrenman</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Hızlı Erişim
          </h3>
          <Link href="/takvim">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Haftalık Program</p>
                  <p className="text-xs text-muted-foreground">
                    Antrenman ve beslenme takvimi
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/ilerleme">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">İlerleme Takibi</p>
                  <p className="text-xs text-muted-foreground">
                    Kilo ve ölçüm grafikleri
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Program Özeti</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-2 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Hafta 1-2:</span>
              <span className="font-medium">Full Body (Adaptasyon)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Hafta 3-4:</span>
              <span className="font-medium">Split (Bölgesel)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Antrenman saati:</span>
              <span className="font-medium">19:00 - 20:30</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">İlk öğün:</span>
              <span className="font-medium">10:30 - 11:00</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Yüzme:</span>
              <span className="font-medium">Sal, Per, Cmt (Hf 1-2)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Not:</span>
              <span className="font-medium text-yellow-500">Süt yok! 🚫🥛</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
