import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Scale, Ruler, Heart, Info } from "lucide-react";

export default function AyarlarPage() {
  return (
    <div>
      <Header title="Ayarlar" subtitle="Profil ve sağlık bilgileri" />
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Başlangıç kilosu</span>
              </div>
              <span className="text-sm font-medium">96 kg</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Hedef kilo</span>
              </div>
              <span className="text-sm font-medium text-primary">85 kg</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Boy</span>
              </div>
              <span className="text-sm font-medium">178 cm</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">BMI</span>
              </div>
              <span className="text-sm font-medium">30.3 (Obez sınırı)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Sağlık Notları
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">🦵</Badge>
              <p className="text-sm">Sağ diz menisküs — Tam ROM gerektiren egzersizlerde dikkat</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">🤚</Badge>
              <p className="text-sm">Sol el bileği hafif ağrı — Bilek baskısı olan hareketlerde dikkat</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0">🚫🥛</Badge>
              <p className="text-sm">Süt kullanılmıyor (gaz yapıyor) — Ayran, su, badem sütü kullanılıyor</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Günlük Akış
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {[
              { time: "08:30", event: "Uyanış" },
              { time: "08:30-11:00", event: "Çocuk okula, toplantılar" },
              { time: "10:30-11:00", event: "İlk kahvaltı fırsatı" },
              { time: "19:00-20:30", event: "Antrenman" },
              { time: "20:30-21:00", event: "Duş & toparlanma" },
              { time: "21:00", event: "Antrenman sonrası beslenme" },
              { time: "24:00", event: "Uyku" },
            ].map(({ time, event }) => (
              <div key={time} className="flex justify-between text-xs">
                <span className="text-muted-foreground font-mono">{time}</span>
                <span>{event}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Supplement Takvimi</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Hafta 1-2:</span>
              <span className="font-medium">Supplement yok</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Hafta 3:</span>
              <span className="font-medium">Whey Protein (su ile)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Hafta 4:</span>
              <span className="font-medium">Whey + Omega-3 + Magnezyum</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
