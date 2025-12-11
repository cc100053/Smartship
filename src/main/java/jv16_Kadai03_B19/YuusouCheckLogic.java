package jv16_Kadai03_B19;

public class YuusouCheckLogic {
	public void execute(Yuusou yuusou) {
		int W = yuusou.getW();
		int D = yuusou.getD();
		int H = yuusou.getH();
		double Weight = yuusou.getWeight();
		int WDH = W+D+H;
		
		String judge = "サイズオーバー、引っ越し会社に頼んで";
		if (WDH <= 60 && H <=3 && Weight <=1) {
			judge = "ゆうパケット 230円";
		} else if (WDH >= 60 && WDH <80 && Weight <=25) {
			judge = "ゆうパック60サイズ 750円";
		} else if (WDH >=80  && WDH <100 && Weight <=25) {
			judge = "ゆうパック80サイズ 870円";
		} else if (WDH >=100  && WDH <120 && Weight <=25) {
			judge = "ゆうパック100サイズ 1070円";
		} else if (WDH >=120  && WDH <140 && Weight <=25) {
			judge = "ゆうパック120サイズ 1200円";
		}
		yuusou.setJudge(judge);
	}

}
